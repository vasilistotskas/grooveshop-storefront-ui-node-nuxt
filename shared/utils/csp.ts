/**
 * Content-Security-Policy directive builder — the single source of truth
 * for the site's CSP, consumed from two places:
 *
 *   - ``server/middleware/3.csp.ts`` (runtime): SSR responses, with a
 *     per-request nonce + 'strict-dynamic' in production.
 *   - ``nuxt.config.ts`` (build time): static ``routeRules`` headers for
 *     the prerendered pages, which are served by Nitro's static handler
 *     and never pass through server middleware — nonce-free by design,
 *     since their inline scripts are baked at build time and depend on
 *     'unsafe-inline' staying effective (a policy that mentions nonces
 *     would disable it).
 *
 * Pure function — no Nuxt/Nitro imports — so both consumers and the unit
 * tests share the exact same output.
 */

export interface CspOptions {
  /** Dev-mode relaxations (plain http/ws upstream, error-overlay iframe). */
  dev: boolean
  /** Public media-stream origin (``NUXT_PUBLIC_MEDIA_STREAM_ORIGIN``). */
  mediaStreamOrigin?: string
  /** Public static-files origin (``NUXT_PUBLIC_STATIC_ORIGIN``). */
  staticOrigin?: string
  /** PUBLIC Django host (``NUXT_PUBLIC_DJANGO_HOST_NAME``) — never the internal SSR upstream. */
  djangoHostName?: string
  /**
   * Tenant-specific API host (``TenantConfig.apiDomain``), e.g.
   * ``api.tenant.com``. Added ADDITIVELY alongside ``djangoHostName`` in
   * connect-src (both https:// and wss://) — the platform host stays
   * listed too since SSR-emitted assets, the WebSocket plugin's dev-time
   * fallback, etc. may still reference it. Omit when the tenant has no
   * distinct API domain (e.g. the platform's own storefront).
   */
  tenantApiDomain?: string
  /**
   * Tenant-specific asset-processing host (``TenantConfig.assetsDomain``),
   * e.g. ``assets.tenant.com``. Added ADDITIVELY alongside the platform
   * ``mediaStreamOrigin`` in img-src/connect-src — see ``tenantApiDomain``
   * doc for the same rationale (SSR-emitted assets may still reference the
   * platform origin).
   */
  tenantAssetsDomain?: string
  /**
   * Tenant-specific static-file host (``TenantConfig.staticDomain``), e.g.
   * ``static.tenant.com``. Added ADDITIVELY alongside the platform
   * ``staticOrigin`` in img-src/connect-src.
   */
  tenantStaticDomain?: string
  /** Meta Pixel id — Facebook origins are emitted only when provisioned. */
  metaPixelId?: string
  /** TikTok Pixel id — TikTok origins are emitted only when provisioned. */
  tiktokPixelId?: string
  /**
   * Per-tenant CSP source expansion (``TenantConfig.allowedCspSources``).
   * Appended to script-src, img-src, connect-src and frame-src. The
   * builder re-filters defensively: only ``https://`` origins (plus
   * ``wss://`` websocket endpoints and ``http://localhost`` for dev)
   * are accepted — any other scheme (data:, blob:, http:// in
   * production) is dropped silently so a misconfigured tenant record
   * cannot weaken the policy.
   */
  tenantSources?: string[]
  /** Per-request script nonce; omit for the nonce-free (prerender) policy. */
  nonce?: string
}

export function buildCspDirectives(options: CspOptions): string[] {
  const {
    dev,
    mediaStreamOrigin = '',
    staticOrigin = '',
    djangoHostName = 'localhost',
    metaPixelId,
    tiktokPixelId,
    tenantSources = [],
    tenantApiDomain,
    tenantAssetsDomain,
    tenantStaticDomain,
    nonce,
  } = options

  // Per-tenant source expansion — see the CspOptions doc for the
  // scheme allowlist rationale.
  const safeTenantSources = tenantSources.filter(
    src => src.startsWith('https://')
      || src.startsWith('wss://')
      || src.startsWith('http://localhost'),
  )
  const tenantExtra = safeTenantSources.length > 0
    ? ` ${safeTenantSources.join(' ')}`
    : ''

  // Browser-fetchable asset origins: the media-stream service and the static
  // host. Deduplicated, non-empty. Used for img-src (and connect-src so client
  // fetch()/prefetch of these assets is allowed).
  //
  // NOTE: the INTERNAL SSR upstream (``NUXT_DJANGO_URL``, e.g.
  // http://backend-service:80) MUST NOT appear in a browser-facing CSP: the
  // browser never talks to it directly (it reaches Django only via
  // same-origin '/api/**' proxy routes and the wss:// notification socket
  // below). Only the PUBLIC API origin belongs here.
  const tenantAssetOrigins = [tenantAssetsDomain, tenantStaticDomain]
    .filter((domain): domain is string => !!domain)
    .map(domain => `https://${domain}`)

  const assetOrigins = [...new Set(
    [mediaStreamOrigin, staticOrigin, ...tenantAssetOrigins].filter(Boolean),
  )].join(' ')

  // In dev the API/WebSocket use plain http/ws; in production https/wss.
  const httpScheme = dev ? 'http' : 'https'
  const wsScheme = dev ? 'ws' : 'wss'
  const apiOrigin = `${httpScheme}://${djangoHostName}`

  // Tenant API origin — additive alongside the platform apiOrigin (see the
  // CspOptions doc). The WebSocket plugin and the allauth social-login
  // redirect both dial the tenant's own API host when one is resolved, so
  // connect-src must allow it too or those requests are CSP-blocked.
  const tenantApiConnectSrc = tenantApiDomain
    ? ` ${httpScheme}://${tenantApiDomain} ${wsScheme}://${tenantApiDomain}`
    : ''

  // Per-request nonce for script-src (strict CSP). Tiered so every browser
  // generation gets the strongest policy it understands:
  //   - CSP3: `'nonce-…' 'strict-dynamic'` — SSR-emitted scripts carry the
  //     nonce (stamped by ``server/plugins/csp-nonce.ts``); scripts THEY
  //     inject (gtag, pixels via @nuxt/scripts) inherit trust. Host sources,
  //     'self' and 'unsafe-inline' below are ignored by these browsers.
  //   - CSP2 (nonce, no strict-dynamic): nonce'd SSR scripts run; dynamic
  //     third-party injections fall back to the host allowlist.
  //   - CSP1: falls back to 'unsafe-inline' + hosts (previous behavior).
  const nonceScriptSrc = nonce ? ` 'nonce-${nonce}' 'strict-dynamic'` : ''

  // OpenStreetMap-based tile providers used by the checkout
  // locker map (``CheckoutSmartpointMap.client.vue``). Both
  // ``cartocdn.com`` (CARTO Positron / Dark Matter) and
  // ``tile.openstreetmap.org`` are listed so an operator can swap
  // ``ShippingProvider.metadata.tile_provider.url`` to either
  // without redeploying. Keep this list in sync with any
  // additions to the tile-provider whitelist on the Django side.
  const tileOrigins = 'https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org'

  // Meta Pixel runtime origins: the script comes from
  // ``connect.facebook.net``; pixel beacons are sent to
  // ``www.facebook.com/tr`` (img + connect); the ``fbevents.js``
  // bundle additionally probes ``static.xx.fbcdn.net`` for resource
  // assets. Listed only when a Pixel ID is provisioned so visitors
  // of un-instrumented preview deploys don't send a needlessly
  // permissive header.
  const metaScriptSrc = metaPixelId ? ' https://connect.facebook.net' : ''
  const metaImgSrc = metaPixelId
    ? ' https://www.facebook.com https://*.facebook.com'
    : ''
  const metaConnectSrc = metaPixelId
    ? ' https://www.facebook.com https://*.facebook.com'
    : ''
  // fbevents.js additionally creates a hidden www.facebook.com iframe
  // (browser-feature probing) and falls back to a <form> POST to
  // ``www.facebook.com/tr/`` when an event payload exceeds beacon/img
  // URL limits — both were CSP-blocked in production (visible in
  // Lighthouse console errors), silently dropping those events.
  const metaFrameSrc = metaPixelId ? ' https://www.facebook.com' : ''
  const metaFormAction = metaPixelId ? ' https://www.facebook.com' : ''

  // TikTok Pixel runtime origins: ``events.js`` (and its secondary
  // chunks) load from ``analytics.tiktok.com``; event beacons post to
  // the same host but may be re-routed to regional endpoints (e.g.
  // ``analytics-sg.tiktok.com``), hence the wildcard on img/connect.
  // Same gating rationale as the Meta block above.
  const tiktokScriptSrc = tiktokPixelId ? ' https://analytics.tiktok.com' : ''
  const tiktokImgSrc = tiktokPixelId
    ? ' https://analytics.tiktok.com https://*.tiktok.com'
    : ''
  const tiktokConnectSrc = tiktokPixelId
    ? ' https://analytics.tiktok.com https://*.tiktok.com'
    : ''

  // GA4 with Google Signals enabled fires a remarketing pixel to
  // ``www.google.<tld>/ads/ga-audiences`` (an <img>, sometimes a beacon).
  // The ccTLD follows the visitor's locale — ``.gr`` for Greek users,
  // ``.com`` for Google's own PageSpeed/Lighthouse runners. Without these
  // origins the pixel is CSP-blocked, which surfaces as a console error +
  // a DevTools "Issues" entry and (non-deterministically, depending on
  // whether the beacon fires that run) drops the Lighthouse Best-Practices
  // score below 100. Scoped to img/connect only — Google never serves our
  // scripts from these hosts.
  const googleAdsOrigins = 'https://www.google.com https://www.google.gr'

  return [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://js.stripe.com https://challenges.cloudflare.com${metaScriptSrc}${tiktokScriptSrc}${tenantExtra}${nonceScriptSrc}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' data: blob: ${assetOrigins} https://www.googletagmanager.com https://*.google-analytics.com ${googleAdsOrigins} ${tileOrigins}${metaImgSrc}${tiktokImgSrc}${tenantExtra}`,
    `font-src 'self' https://fonts.gstatic.com`,
    `connect-src 'self' ${assetOrigins} ${apiOrigin} https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com ${googleAdsOrigins} https://stats.g.doubleclick.net https://api.stripe.com ${wsScheme}://${djangoHostName}${tenantApiConnectSrc}${metaConnectSrc}${tiktokConnectSrc}${tenantExtra}`,
    // BoxNow widget iframe origins per their CDN: gr (primary), plus
    // cy/bg/hr regional variants (Phase 2 multi-country).
    // ``widget-v4.boxnow.gr`` is required even though we load the v5 URL:
    // BoxNow's CDN HTTP-redirects ``widget-v5.boxnow.gr/iframe.html`` to
    // widget-v4, and CSP validates every hop of a frame's redirect chain
    // against frame-src — without it the checkout locker modal is blocked.
    // Keep in sync with ``BOXNOW_ALLOWED_ORIGINS`` in
    // ``app/composables/useBoxNowWidget.ts``.
    // ``data:`` is added in dev so Nuxt's nitro error overlay (which
    // base64-encodes a stack-trace iframe) can render — production
    // never ships that overlay so the scheme stays out of prod CSP.
    `frame-src 'self'${dev ? ' data:' : ''} https://js.stripe.com https://challenges.cloudflare.com https://accounts.google.com https://widget-v5.boxnow.gr https://widget-v5.boxnow.cy https://widget-v5.boxnow.bg https://widget-v5.boxnow.hr https://widget-v4.boxnow.gr https://widget.boxnow.gr${metaFrameSrc}${tenantExtra}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'${metaFormAction}`,
    `frame-ancestors 'none'`,
  ]
}
