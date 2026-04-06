/**
 * Adds X-Forwarded-Proto: https and X-Forwarded-Host to all $fetch calls
 * targeting internal backend services.
 *
 * Why X-Forwarded-Proto: Django's SecurityMiddleware checks
 * SECURE_PROXY_SSL_HEADER for the X-Forwarded-Proto header. Without it,
 * SECURE_SSL_REDIRECT=True causes a 301 to the external HTTPS URL, which
 * exits the K8s cluster and hits Cloudflare's managed challenge — returning
 * 403 because server-side requests can't execute the JS challenge.
 *
 * Why X-Forwarded-Host: With USE_X_FORWARDED_HOST=True, Django uses this
 * header to build absolute URLs (request.build_absolute_uri()). Without it,
 * Django falls back to the request Host header which is the internal K8s
 * service name (e.g. backend-service), so paginated `next` links are
 * returned as `https://backend-service/...` — a domain with no public TLS
 * certificate. The next $fetch call to that link then fails with
 * `<no response> fetch failed` and the sitemap generator (and any other
 * follow-the-next-link consumer) breaks.
 *
 * How: Initialises the named `$backendFetch` utility (server/utils/backendFetch.ts)
 * at startup and keeps the global $fetch patch as a safety net for the ~30
 * cached routes that still call $fetch directly without an explicit origin.
 * New server routes should prefer `useBackendFetch()` over raw `$fetch`.
 *
 * Migration path: incrementally update consumers to call useBackendFetch() and
 * remove the globalThis patch once no routes rely on it.
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

  const publicHost = typeof config.public.djangoHostName === 'string'
    ? config.public.djangoHostName
    : undefined

  // Warm up the named instance so it is ready for first use.
  useBackendFetch()

  // Keep the global patch as a safety net for existing routes that use $fetch
  // directly. Remove this block once all backend-facing routes use useBackendFetch().
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
      if (publicHost && !options.headers.has('X-Forwarded-Host')) {
        options.headers.set('X-Forwarded-Host', publicHost)
      }
    },
  }) as typeof globalThis.$fetch

  log.info('forwarded-proto', 'forwarded-proto interceptor active', { origins: internalOrigins, publicHost })
})
