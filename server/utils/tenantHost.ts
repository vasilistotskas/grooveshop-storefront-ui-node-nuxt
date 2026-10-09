import { getRequestHost } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'

/**
 * A Host as the store it names: lower case — hostnames are
 * case-insensitive, and Django matches `TenantDomain` exactly — and
 * without a port, since `TenantDomain` stores bare hostnames. Idempotent.
 */
export function tenantHostOf(host: string): string {
  return host.toLowerCase().replace(/:\d+$/, '')
}

/**
 * The store a request names: its Host header — never X-Forwarded-Host,
 * which the client controls — as {@link tenantHostOf} names it.
 *
 * `server/middleware/0.tenant.ts` calls this once, first thing on every
 * request, and keeps the result as `context.tenantHost`; everything else
 * reads it from there through {@link requestTenantHost}.
 */
export function resolveTenantHost(event: RequestEvent): string {
  return tenantHostOf(getRequestHost(event))
}

/**
 * The store a request is for, as the tenant middleware resolved it.
 *
 * Everything keyed on the store uses this one value: tenant resolution,
 * `tenantCacheKey`, the rate limits and the X-Forwarded-Host sent to
 * Django. A raw Host differing in case or port resolved the same store
 * yet missed its caches and rate-limit buckets, and a capital letter
 * was "Store not found".
 *
 * Read from the context, so it serves every event the server hands out:
 * a route's, and the h3 event Nitro passes to cache keys and plugins.
 */
export function requestTenantHost(event: Pick<RequestEvent, 'context'>): string {
  const host = event.context.tenantHost
  if (!host) {
    throw new Error('No tenant host on this request: server/middleware/0.tenant.ts resolves it first')
  }
  return host
}
