import type { H3Event } from 'h3'

/**
 * Prefix a cache key with the tenant host to prevent cross-tenant
 * cache contamination. Use in every `getKey` of `defineCachedEventHandler`.
 */
export function tenantCacheKey(event: H3Event, key: string): string {
  const host = getRequestHost(event, { xForwardedHost: false })
  return `${host}:${key}`
}
