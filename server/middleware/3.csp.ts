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
    metaPixelId?: string
    tiktokPixelId?: string
  }

  const cleanPath = (path.split('?')[0] ?? '').replace(/\/+$/, '') || '/'
  const useNonce = !import.meta.dev
    && !PRERENDERED_ROUTES_SET.has(cleanPath)
    && !getRequestHeader(event, 'x-nitro-prerender')
  let nonce: string | undefined
  if (useNonce) {
    nonce = generateCspNonce()
    event.context.cspNonce = nonce
  }

  const directives = buildCspDirectives({
    dev: import.meta.dev,
    mediaStreamOrigin: publicConfig.mediaStreamOrigin,
    staticOrigin: publicConfig.static?.origin,
    djangoHostName: publicConfig.djangoHostName || 'localhost',
    metaPixelId: publicConfig.metaPixelId,
    tiktokPixelId: publicConfig.tiktokPixelId,
    nonce,
  })

  setResponseHeader(event, 'Content-Security-Policy', directives.join('; '))
})
