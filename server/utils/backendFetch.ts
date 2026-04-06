/**
 * Named $fetch instance pre-configured for internal backend calls.
 *
 * Automatically adds two forwarded headers to every request so that Django
 * builds correct absolute URLs and does not 301-redirect inside the cluster:
 *
 * - `X-Forwarded-Proto: https` — prevents `SECURE_SSL_REDIRECT=True` from
 *   issuing a 301 to the public HTTPS URL.
 * - `X-Forwarded-Host` (= `NUXT_PUBLIC_DJANGO_HOST_NAME`) — overrides the
 *   internal K8s service name when Django builds paginated `next` links via
 *   `request.build_absolute_uri()` (USE_X_FORWARDED_HOST=True). Without it,
 *   `next` URLs come back as `https://backend-service/...` and the next
 *   $fetch fails with `<no response> fetch failed`.
 *
 * The same logic lives in the `forwarded-proto` Nitro plugin as a global
 * safety net, but using this named instance is the preferred approach for
 * new server routes because it avoids patching globalThis.$fetch.
 *
 * Usage:
 *   const data = await $backendFetch(`${config.apiBaseUrl}/some/endpoint`)
 */

let _backendFetch: typeof $fetch | undefined

export function useBackendFetch(): typeof $fetch {
  if (_backendFetch) return _backendFetch

  const config = useRuntimeConfig()

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

  const publicHost = typeof config.public.djangoHostName === 'string'
    ? config.public.djangoHostName
    : undefined

  _backendFetch = $fetch.create({
    onRequest({ request, options }) {
      const url = typeof request === 'string'
        ? request
        : request instanceof URL
          ? request.href
          : request.url

      if (internalOrigins.length > 0 && !internalOrigins.some(origin => url.startsWith(origin))) return

      options.headers = new Headers(options.headers as HeadersInit)
      if (!options.headers.has('X-Forwarded-Proto')) {
        options.headers.set('X-Forwarded-Proto', 'https')
      }
      if (publicHost && !options.headers.has('X-Forwarded-Host')) {
        options.headers.set('X-Forwarded-Host', publicHost)
      }
    },
  }) as typeof $fetch

  return _backendFetch
}
