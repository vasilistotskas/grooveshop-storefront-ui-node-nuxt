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
 * - the visitor's identity (`X-Real-IP`, `X-Origin-Verify`, `User-Agent`,
 *   `X-Forwarded-For`) from `clientIdentityHeaders()`, so Django's
 *   per-caller throttles see the caller rather than this pod.
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
import { clientIdentityHeaders } from './clientIdentity'

/**
 * The `$fetch.create` instance is cached at module level, but the
 * configuration values it depends on (the backend origins, `fallbackPublicHost`)
 * are resolved on every onRequest call. Previously these were baked
 * at first call, so a runtime-config swap (dev hot-reload, test
 * isolation) silently kept the stale origin list. See H16 in
 * MULTI_TENANT_AUDIT.md.
 */
let _backendFetch: typeof $fetch | undefined

/** The origin of `url`, or undefined for one that is not absolute. */
function originOf(url: string): string | undefined {
  try {
    return new URL(url).origin
  }
  catch {
    return undefined
  }
}

/**
 * Whether `url` is a call to Django — the one test for which requests
 * carry the forwarded headers and the visitor's identity, including
 * `X-Origin-Verify`, the edge secret Django trusts.
 *
 * Its ORIGIN must be one of the configured backend origins
 * (`NUXT_DJANGO_URL`, `NUXT_API_BASE_URL`). A prefix test passed
 * `http://backend.test.evil.example` and `http://backend.test@evil.example`
 * (userinfo; the host is evil.example) for `http://backend.test`. A URL
 * that does not parse, a relative one, or one checked with no backend
 * configured is not internal: the secret goes nowhere it was not meant
 * for. `startup-validation` refuses to boot without both origins.
 */
export function isInternalBackendUrl(
  url: string,
  config: ReturnType<typeof useRuntimeConfig> = useRuntimeConfig(),
): boolean {
  const origin = originOf(url)
  if (!origin) return false
  return [config.djangoUrl, config.apiBaseUrl].some(
    base => typeof base === 'string' && originOf(base) === origin,
  )
}

export function useBackendFetch(): typeof $fetch {
  if (_backendFetch) return _backendFetch

  _backendFetch = $fetch.create({
    onRequest({ request, options }) {
      const config = useRuntimeConfig()
      const fallbackPublicHost = typeof config.public.djangoHostName === 'string'
        ? config.public.djangoHostName
        : undefined

      const url = typeof request === 'string'
        ? request
        : request instanceof URL
          ? request.href
          : request.url

      if (!isInternalBackendUrl(url, config)) return

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
        requestHost = event ? requestTenantHost(event) : undefined
        locale = event?.context?.locale
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
      try {
        const event = useEvent()
        const correlationId = event ? getRequestHeader(event, 'x-correlation-id') : undefined
        if (correlationId && !options.headers.has('X-Correlation-ID')) {
          options.headers.set('X-Correlation-ID', correlationId)
        }
        // The visitor's IP and proof of edge, the same as `createHeaders()`
        // sends: without them Django keyed every anonymous throttle on
        // these routes to the Nuxt pod (see server/utils/clientIdentity.ts).
        if (event) {
          for (const [name, value] of Object.entries(clientIdentityHeaders(event))) {
            if (!options.headers.has(name)) options.headers.set(name, value)
          }
        }
      }
      catch {
        // useEvent() unavailable outside active Nitro request — skip
      }
    },
  }) as typeof $fetch

  return _backendFetch
}
