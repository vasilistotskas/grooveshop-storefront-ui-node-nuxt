import type { H3Event } from 'h3'

/**
 * 32-bit FNV-1a. Used (twice, differently seeded) to disambiguate
 * cache keys after Nitro's escaping — see tenantCacheKey.
 */
function fnv1a(str: string, seed: number): number {
  let h = seed >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/**
 * Prefix a cache key with the tenant host to prevent cross-tenant
 * cache contamination. Use in every `getKey` of `defineCachedEventHandler`.
 *
 * The returned key ends with a word-character-only hash of the raw
 * `host:key` string. This is load-bearing: nitropack passes custom
 * keys through `escapeKey` (`String(key).replace(/\W/g, '')`), which
 * deletes every dot, colon, hyphen, `=` and `&`. Without the hash,
 * punctuation-equivalent inputs collide AFTER escaping — e.g.
 * `my-store.gr` vs `mystore.gr` would share every cached response
 * (cross-tenant data leak), and `ordering=-price` vs `ordering=price`
 * would share one entry. The readable prefix survives (stripped) for
 * debuggability; the 64 bits of FNV-1a carry the actual uniqueness.
 */
export function tenantCacheKey(event: H3Event, key: string): string {
  const host = getRequestHost(event, { xForwardedHost: false })
  return hashedCacheKey(`${host}:${key}`)
}

/**
 * Append the escape-surviving dual-FNV hash to a raw cache key string.
 * Use for `defineCachedFunction` getKeys (no H3Event available) — same
 * escapeKey-collision rationale as {@link tenantCacheKey}.
 */
export function hashedCacheKey(raw: string): string {
  const h1 = fnv1a(raw, 0x811C9DC5).toString(36)
  const h2 = fnv1a(raw, 0x9747B28C).toString(36)
  return `${raw}_${h1}${h2}`
}
