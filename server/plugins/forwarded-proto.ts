/**
 * Adds X-Forwarded-Proto, X-Forwarded-Host, and X-Language to all $fetch
 * calls targeting internal backend services.
 *
 * Why X-Forwarded-Proto: Django's SecurityMiddleware checks
 * SECURE_PROXY_SSL_HEADER. Without it, SECURE_SSL_REDIRECT=True causes a
 * 301 to the external HTTPS URL, which exits the K8s cluster and hits
 * Cloudflare's managed challenge — returning 403 because server-side
 * requests can't execute the JS challenge.
 *
 * Why X-Forwarded-Host: With USE_X_FORWARDED_HOST=True, Django uses this
 * header to build absolute URLs (request.build_absolute_uri()) — without
 * it, paginated `next` links come back as `https://backend-service/...`
 * which has no public TLS cert and breaks follow-up fetches. Additionally,
 * Django's TenantMainMiddleware resolves the tenant schema from this
 * header, so multi-tenant deployments need the actual request host
 * forwarded (not a hardcoded hostname).
 *
 * Why X-Language: Django's allauth adapter + Celery email tasks read this
 * header to render responses/emails in the correct locale.
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

      // X-Forwarded-Host and X-Language both need the request context.
      // Prefer the request host (tenant resolution); fall back to publicHost
      // (single-tenant config) when outside a request context.
      try {
        const event = useEvent()
        if (!options.headers.has('X-Forwarded-Host')) {
          const host = getRequestHost(event, { xForwardedHost: false }) || publicHost
          if (host) {
            options.headers.set('X-Forwarded-Host', host)
          }
        }
        if (!options.headers.has('X-Language')) {
          const locale = event?.context?.locale as string | undefined
          if (locale) options.headers.set('X-Language', locale)
        }
      }
      catch {
        // useEvent() may fail outside a request context (e.g., during startup).
        if (publicHost && !options.headers.has('X-Forwarded-Host')) {
          options.headers.set('X-Forwarded-Host', publicHost)
        }
      }
    },
  }) as typeof globalThis.$fetch

  log.info('forwarded-headers', 'Backend header interceptor active', { origins: internalOrigins, publicHost })
})
