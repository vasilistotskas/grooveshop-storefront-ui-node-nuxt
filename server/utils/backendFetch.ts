/**
 * Named $fetch instance pre-configured for internal backend calls.
 *
 * Automatically adds `X-Forwarded-Proto: https` to every request so that
 * Django's SecurityMiddleware does not issue a 301 redirect when
 * SECURE_SSL_REDIRECT=True is set.  The same logic lives in the
 * `forwarded-proto` Nitro plugin as a global safety net, but using this
 * named instance is the preferred approach for new server routes because it
 * avoids patching globalThis.$fetch.
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
    },
  }) as typeof $fetch

  return _backendFetch
}
