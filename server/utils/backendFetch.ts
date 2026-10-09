/**
 * The fetcher for every call to Django.
 *
 * It adds the forwarded headers Django needs to answer as the right
 * store, without redirecting inside the cluster:
 *
 * - `X-Forwarded-Proto: https` — prevents `SECURE_SSL_REDIRECT=True` from
 *   issuing a 301 to the public HTTPS URL, which exits the cluster and
 *   meets Cloudflare's challenge.
 * - `X-Forwarded-Host` — the store the call is for, so Django's
 *   `TenantMainMiddleware` picks its schema and absolute URLs (paginated
 *   `next` links) name the public host.
 * - `X-Language` — the language Django renders the response and any
 *   email in.
 * - the visitor's identity (`X-Real-IP`, `X-Origin-Verify`, `User-Agent`,
 *   `X-Forwarded-For`) from `clientIdentityHeaders()` and the request's
 *   `X-Correlation-ID`, so Django's per-caller throttles see the caller
 *   rather than this pod.
 *
 * A header the call sets itself (the allauth routes pass `createHeaders`)
 * wins over these. They go to Django only: `isInternalBackendUrl` keeps
 * the edge secret off any other host.
 *
 * Nitro's global `$fetch` is not used on the server: Nitro v3 drops it,
 * and patching it is what made a store's identity depend on whether a
 * request context happened to be bound. Every call names its request, or
 * the store and language a cached function was keyed by.
 */
import { $fetch } from 'ofetch'
import type { $Fetch } from 'ofetch'
import { getRequestHeader, useRuntimeConfig } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'
import { clientIdentityHeaders } from './clientIdentity'

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

export interface BackendCall {
  /** The store the call is for, as `tenantHostOf` names it: `X-Forwarded-Host`. */
  tenantHost: string
  /** The language Django answers in: `X-Language`. */
  locale?: string
  /** Further headers every call carries: the visitor's identity, the correlation id. */
  headers?: Record<string, string>
}

/**
 * A fetcher for Django calls made on behalf of `call`'s store: what a
 * cached function uses, since it has no request, only the store and
 * language it is keyed by.
 */
export function backendFetchFor({ tenantHost, locale, headers = {} }: BackendCall): $Fetch {
  const forwarded: Record<string, string> = {
    'X-Forwarded-Proto': 'https',
    'X-Forwarded-Host': tenantHost,
    ...(locale ? { 'X-Language': locale } : {}),
    ...headers,
  }
  return $fetch.create({
    onRequest({ request, options }) {
      const url = typeof request === 'string' ? request : request.url
      if (!isInternalBackendUrl(url)) return
      const merged = new Headers(options.headers)
      for (const [name, value] of Object.entries(forwarded)) {
        if (!merged.has(name)) merged.set(name, value)
      }
      options.headers = merged
    },
  })
}

/** A fetcher for Django calls made while answering `event`. */
export function useBackendFetch(event: RequestEvent): $Fetch {
  const correlationId = getRequestHeader(event, 'x-correlation-id')
  return backendFetchFor({
    tenantHost: requestTenantHost(event),
    locale: requestLocale(event),
    headers: {
      ...clientIdentityHeaders(event),
      ...(correlationId ? { 'X-Correlation-ID': correlationId } : {}),
    },
  })
}
