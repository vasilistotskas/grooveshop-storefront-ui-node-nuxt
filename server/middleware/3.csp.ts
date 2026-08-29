/**
 * Content Security Policy middleware.
 *
 * Sets a restrictive CSP header on HTML responses to mitigate XSS. The
 * directives themselves live in ``shared/utils/csp.ts`` (single source of
 * truth, also used by ``nuxt.config.ts`` for the prerendered pages'
 * static ``routeRules`` headers — those responses are served by Nitro's
 * static handler and never reach this middleware).
 *
 * In production SSR the policy carries a per-request nonce +
 * 'strict-dynamic'; ``server/plugins/csp-nonce.ts`` stamps the matching
 * attribute onto the SSR-emitted markup. The nonce is skipped in three
 * cases (policy then matches the pre-nonce behavior):
 *   - dev: Vite's HMR client injects scripts outside the SSR pipeline.
 *   - build-time prerender passes (`x-nitro-prerender` header): a baked
 *     nonce attribute would be stale on every real request.
 *   - serving a prerendered static page path via SSR fallback: its inline
 *     scripts carry no usable nonce, so 'unsafe-inline' must stay
 *     effective — the policy must not mention nonces at all or browsers
 *     disable 'unsafe-inline'.
 *
 * Skipped for API routes (JSON responses) and static assets.
 */
export default defineEventHandler((event) => {
  const path = event.path

  // Skip CSP for API routes, static assets, and internal Nuxt routes
  if (path.startsWith('/api/') || path.startsWith('/_nuxt/') || path.startsWith('/_ipx/')) {
    return
  }

  const config = useRuntimeConfig()
  const publicConfig = config.public as {
    mediaStreamOrigin?: string
    static?: { origin?: string }
    djangoHostName?: string
  }

  const cleanPath = (path.split('?')[0] ?? '').replace(/\/+$/, '') || '/'
  // import.meta.prerender rather than the x-nitro-prerender header: the
  // header is client-supplied, so a visitor could suppress the nonce on
  // any route and get the weaker baked policy instead.
  // isCachedSsrRoute covers every response replayed from Nitro's cache
  // (static brand pages, the homepage, and the blog + catalogue route
  // families): a per-request nonce would be reused for the whole cache
  // lifetime. It is a function, not the exact-path Set, because the
  // content routes are globs.
  const useNonce = !import.meta.dev
    && !isCachedSsrRoute(cleanPath)
    && !import.meta.prerender
  let nonce: string | undefined
  if (useNonce) {
    nonce = generateCspNonce()
    event.context.cspNonce = nonce
  }

  // Per-tenant CSP inputs. The tenant arrives on event.context from
  // ``server/middleware/0.tenant.ts``; pixel ids are TENANT-ONLY — no
  // platform/env fallback (every tenant provisions its own Pixel; a
  // shared id would mix ad accounts across merchants) — and
  // ``allowedCspSources`` expands the four browser-facing directives
  // (the builder re-filters the schemes defensively).
  //
  // ``djangoHostName`` stays config-first as the PLATFORM fallback: SSR
  // assets and dev-time requests may still reference it. The WebSocket
  // plugin and the allauth social-login redirect now prefer the tenant's
  // OWN API host (``TenantConfig.apiDomain``) when one is resolved, so
  // ``tenantApiDomain`` is passed additively — connect-src ends up
  // allowing both origins rather than swapping one for the other.
  const tenant = event.context.tenant
  const requestHost = getRequestHost(event, { xForwardedHost: false })
  const directives = buildCspDirectives({
    dev: import.meta.dev,
    mediaStreamOrigin: publicConfig.mediaStreamOrigin,
    staticOrigin: publicConfig.static?.origin,
    djangoHostName: publicConfig.djangoHostName || requestHost || 'localhost',
    metaPixelId: tenant?.metaPixelId,
    tiktokPixelId: tenant?.tiktokPixelId,
    tenantSources: tenant?.allowedCspSources ?? [],
    tenantApiDomain: tenant?.apiDomain,
    tenantAssetsDomain: tenant?.assetsDomain,
    tenantStaticDomain: tenant?.staticDomain,
    nonce,
  })

  setResponseHeader(event, 'Content-Security-Policy', directives.join('; '))
})
