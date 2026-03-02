/**
 * Adds X-Forwarded-Proto and X-Forwarded-Host to all $fetch calls targeting
 * internal backend services.
 *
 * X-Forwarded-Proto: Django's SecurityMiddleware checks SECURE_PROXY_SSL_HEADER.
 * Without it, SECURE_SSL_REDIRECT=True causes a 301 to the external HTTPS URL,
 * which exits the K8s cluster and hits Cloudflare's managed challenge (403).
 *
 * X-Forwarded-Host: Django's TenantMainMiddleware resolves the tenant schema from
 * the request host. Internal $fetch calls have a Host of e.g. "django-backend:8000",
 * so X-Forwarded-Host is required for correct tenant resolution.
 *
 * How: Uses an ofetch onRequest interceptor scoped to internal backend origins
 * (NUXT_DJANGO_URL / NUXT_API_BASE_URL). Auth/cart routes also set these headers
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

      // Inject X-Forwarded-Host for tenant resolution (uses Nitro async context)
      if (!options.headers.has('X-Forwarded-Host')) {
        try {
          const event = useEvent()
          const host = getRequestHost(event, { xForwardedHost: false })
          if (host) {
            options.headers.set('X-Forwarded-Host', host)
          }
        }
        catch {
          // useEvent() may fail outside a request context (e.g., during startup)
        }
      }
    },
  }) as typeof globalThis.$fetch

  log.info('forwarded-headers', 'Backend header interceptor active', { origins: internalOrigins })
})
