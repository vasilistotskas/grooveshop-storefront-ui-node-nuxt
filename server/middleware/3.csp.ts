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

  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://js.stripe.com https://challenges.cloudflare.com`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' data: blob: ${trustedOrigins} https://www.googletagmanager.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `connect-src 'self' ${trustedOrigins} https://*.google-analytics.com https://api.stripe.com ${wsScheme}://${djangoHost}`,
    `frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com https://accounts.google.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ]

  setResponseHeader(event, 'Content-Security-Policy', directives.join('; '))
})
