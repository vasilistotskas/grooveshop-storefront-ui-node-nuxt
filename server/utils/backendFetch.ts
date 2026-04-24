/**
 * Named $fetch instance pre-configured for internal backend calls.
 *
 * Automatically adds forwarded headers so Django resolves the correct tenant,
 * builds correct absolute URLs, and does not 301-redirect inside the cluster:
 *
 * - `X-Forwarded-Proto: https` — prevents `SECURE_SSL_REDIRECT=True` from
 *   issuing a 301 to the public HTTPS URL.
 * - `X-Forwarded-Host` — tenant-aware. Preferred source is the actual
 *   request host (so Django's `TenantMainMiddleware` picks the tenant
 *   the caller is on). Falls back to `NUXT_PUBLIC_DJANGO_HOST_NAME` only
 *   when there's no active request context (prerender, startup hooks).
 * - `X-Language` — tenant/request locale so Django renders emails and
 *   responses in the right language.
 *
 * Multi-tenant note: previously this instance baked `publicHost` in at
 * module init, which sent every request to Django as if it originated
 * from the single configured Django hostname. In a multi-tenant setup
 * that caused tenant B's writes to land in tenant A's schema. Headers
 * are now resolved per-request via `useEvent()`.
 *
 * The same logic lives in the `forwarded-proto` Nitro plugin as a global
 * safety net, but using this named instance is the preferred approach for
 * new server routes because it avoids patching globalThis.$fetch.
 *
 * Usage:
 *   const data = await useBackendFetch()(`${config.apiBaseUrl}/some/endpoint`)
 */

import { DEFAULT_LOCALE } from '~~/i18n/locales'

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

  const fallbackPublicHost = typeof config.public.djangoHostName === 'string'
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

      // Resolve tenant host + locale per request — useEvent() is only
      // available inside an active Nitro request. Cached/SSR-prerender
      // calls may not have one; fall back to build-time config.
      let requestHost: string | undefined
      let locale: string | undefined
      try {
        const event = useEvent()
        requestHost = event ? getRequestHost(event, { xForwardedHost: false }) : undefined
        locale = event?.context?.locale as string | undefined
      }
      catch {
        requestHost = undefined
        locale = undefined
      }

      if (!options.headers.has('X-Forwarded-Host')) {
        const forwardedHost = requestHost || fallbackPublicHost
        if (forwardedHost) {
          options.headers.set('X-Forwarded-Host', forwardedHost)
        }
      }

      if (!options.headers.has('X-Language')) {
        options.headers.set('X-Language', locale || DEFAULT_LOCALE)
      }
    },
  }) as typeof $fetch

  return _backendFetch
}
