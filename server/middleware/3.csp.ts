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

  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://js.stripe.com https://challenges.cloudflare.com`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' data: blob: ${trustedOrigins} https://www.googletagmanager.com ${tileOrigins}`,
    `font-src 'self' https://fonts.gstatic.com`,
    `connect-src 'self' ${trustedOrigins} https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://www.google.com https://stats.g.doubleclick.net https://api.stripe.com ${wsScheme}://${djangoHost}`,
    // BoxNow widget iframe origins per their CDN: gr (primary), plus
    // cy/bg/hr regional variants (Phase 2 multi-country) and the v1-v4
    // back-compat versions surfaced by the loader script we audited.
    `frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com https://accounts.google.com https://widget-v5.boxnow.gr https://widget-v5.boxnow.cy https://widget-v5.boxnow.bg https://widget-v5.boxnow.hr https://widget.boxnow.gr`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ]

  setResponseHeader(event, 'Content-Security-Policy', directives.join('; '))
})
