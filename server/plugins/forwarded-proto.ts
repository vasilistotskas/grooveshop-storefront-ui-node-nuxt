/**
 * Adds X-Forwarded-Proto: https to all $fetch calls targeting internal backend services.
 *
 * Why: Django's SecurityMiddleware checks SECURE_PROXY_SSL_HEADER for the
 * X-Forwarded-Proto header. Without it, SECURE_SSL_REDIRECT=True causes a 301
 * to the external HTTPS URL (e.g. https://webside.gr/...), which exits the K8s
 * cluster and hits Cloudflare's managed challenge — returning 403 because
 * server-side requests can't execute the JS challenge.
 *
 * How: Uses an ofetch onRequest interceptor scoped to internal backend origins
 * (NUXT_DJANGO_URL / NUXT_API_BASE_URL). Auth/cart routes also set this header
 * explicitly via createHeaders()/getCartHeaders(), but this plugin acts as a
 * safety net for the ~30 cached routes that send no headers at all.
 *
 * Note: Nuxt docs state "$fetch is intentionally not globally configurable" and
 * recommend named instances (https://nuxt.com/docs/guide/recipes/custom-usefetch).
 * This global override is a pragmatic choice to cover all existing routes without
 * modifying 50+ files. A future refactor could migrate routes to a named
 * $backendFetch utility.
 */
export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()

  // Deduplicate internal origins from both config keys
  const internalOrigins = [...new Set(
    [config.djangoUrl, config.apiBaseUrl]
      .filter((url): url is string => typeof url === 'string' && url.length > 0)
      .map((url) => {
        try {
          return new URL(url).origin
        }
        catch {
          return url
        }
      }),
  )]

  if (internalOrigins.length === 0) return

  globalThis.$fetch = globalThis.$fetch.create({
    onRequest({ request, options }) {
      const url = typeof request === 'string'
        ? request
        : request instanceof URL
          ? request.href
          : request.url

      if (!internalOrigins.some(origin => url.startsWith(origin))) return

      // Normalize to Headers instance per ofetch docs, then set if absent.
      options.headers = new Headers(options.headers as HeadersInit)
      if (!options.headers.has('X-Forwarded-Proto')) {
        options.headers.set('X-Forwarded-Proto', 'https')
      }
    },
  }) as typeof globalThis.$fetch

  log.info('forwarded-proto', 'X-Forwarded-Proto interceptor active', { origins: internalOrigins })
})
