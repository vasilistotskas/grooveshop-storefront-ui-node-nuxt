/**
 * Content Security Policy middleware.
 *
 * Sets a restrictive CSP header on HTML responses to mitigate XSS.
 * Allows self, inline styles (required by Nuxt/Vue), and configured
 * external origins (media stream, static assets, analytics).
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

  const mediaSrc = (config.public.mediaStreamOrigin as string) || ''
  const staticSrc = (config.public.static as Record<string, string>)?.origin || ''
  const djangoUrl = (config.djangoUrl as string) || ''

  // Build trusted origins list (deduplicated, non-empty)
  const trustedOrigins = [...new Set(
    [mediaSrc, staticSrc, djangoUrl].filter(Boolean),
  )].join(' ')

  const djangoHost = (config.public.djangoHostName as string) || 'localhost'
  // In dev, the WebSocket connection uses ws:// (plain HTTP); in production it uses wss://
  const wsScheme = import.meta.dev ? 'ws' : 'wss'

  // TODO(csp-nonce): Replace 'unsafe-inline' with a per-request nonce.
  // Doing so requires:
  //   1. Generating a nonce here and storing it on event.context.cspNonce.
  //   2. Using the Nitro `render:html` hook to inject nonce attributes onto
  //      every <script> and <style> tag that Nuxt emits during SSR (hydration
  //      chunks, useHead inline blocks, etc.).
  //   3. Forwarding event.context.cspNonce into the nuxtApp.ssrContext so
  //      useHead's script/style transforms can stamp the attribute.
  // Until that wiring is in place 'unsafe-inline' is kept to avoid breaking
  // Nuxt's hydration bootstrap and inline style bindings.
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
  const metaPixelId = (config.public as { metaPixelId?: string })?.metaPixelId
  const metaScriptSrc = metaPixelId ? ' https://connect.facebook.net' : ''
  const metaImgSrc = metaPixelId
    ? ' https://www.facebook.com https://*.facebook.com'
    : ''
  const metaConnectSrc = metaPixelId
    ? ' https://www.facebook.com https://*.facebook.com'
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

  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://js.stripe.com https://challenges.cloudflare.com${metaScriptSrc}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' data: blob: ${trustedOrigins} https://www.googletagmanager.com https://*.google-analytics.com ${googleAdsOrigins} ${tileOrigins}${metaImgSrc}`,
    `font-src 'self' https://fonts.gstatic.com`,
    `connect-src 'self' ${trustedOrigins} https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com ${googleAdsOrigins} https://stats.g.doubleclick.net https://api.stripe.com ${wsScheme}://${djangoHost}${metaConnectSrc}`,
    // BoxNow widget iframe origins per their CDN: gr (primary), plus
    // cy/bg/hr regional variants (Phase 2 multi-country) and the v1-v4
    // back-compat versions surfaced by the loader script we audited.
    // ``data:`` is added in dev so Nuxt's nitro error overlay (which
    // base64-encodes a stack-trace iframe) can render — production
    // never ships that overlay so the scheme stays out of prod CSP.
    `frame-src 'self'${import.meta.dev ? ' data:' : ''} https://js.stripe.com https://challenges.cloudflare.com https://accounts.google.com https://widget-v5.boxnow.gr https://widget-v5.boxnow.cy https://widget-v5.boxnow.bg https://widget-v5.boxnow.hr https://widget.boxnow.gr`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ]

  setResponseHeader(event, 'Content-Security-Policy', directives.join('; '))
})
