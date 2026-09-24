import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import { requestLocale } from './locale'

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
 * Separates the tenant host from the inner key in a handler cache key.
 * Underscores are the one punctuation Nitro's `escapeKey` keeps, so the
 * boundary survives into the stored key and a purge can match a host
 * exactly (`shop.gr` never claims `shop.gr.com`'s entries — without a
 * delimiter both escape to a `shopgr` prefix). Hostnames cannot contain
 * `_`, so the delimiter is unambiguous.
 */
const TENANT_KEY_DELIMITER = '__'

/**
 * Prefix a cache key with the tenant host and the request locale. Use in
 * every `getKey` of `defineCachedEventHandler`.
 *
 * The host prevents cross-tenant contamination. The locale
 * (`event.context.locale`, the page's language) prevents cross-language
 * contamination: Django answers in the `X-Language` it is sent, and much
 * of what it returns is flat text in that language — product attribute
 * names and values, variant axes, choice labels — so an entry filled by
 * an English page would otherwise be served to a Greek one. Keying every
 * handler here, rather than each route deciding whether its body can
 * vary, is what keeps a route from getting it wrong. The host stays
 * first, so `cacheKeyBelongsToHost` still scopes a purge to one store.
 *
 * The returned key ends with a word-character-only hash of the raw
 * `host__locale__key` string. This is load-bearing: nitropack passes custom
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
  return hashedCacheKey(
    `${host}${TENANT_KEY_DELIMITER}${requestLocale(event)}${TENANT_KEY_DELIMITER}${key}`,
  )
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

/**
 * The token Nitro stores for one `varies` header value on a route-rule
 * cache key (`nitropack/dist/runtime/internal/{cache,hash}.mjs`): the
 * ohash `digest` — SHA-256, base64url — with `-`/`_` dropped, cut to 10
 * characters. Reproduced here because nitropack does not export it and
 * ohash is not a direct dependency; `cacheKey.spec.ts` pins the result
 * against keys copied from the live production keyspace, so a Nitro
 * upgrade that changed the recipe would fail there, not in a silent
 * zero-key purge.
 */
export function nitroVaryHash(value: string): string {
  return createHash('sha256')
    .update(value)
    .digest('base64url')
    .replace(/[-_]/g, '')
    .slice(0, 10)
}

/**
 * Does a stored cache key (relative to the `cache` mount) belong to
 * `host`? Nitro writes a tenant's host into a key in a different shape
 * for each cache family, and a purge scoped to one store must recognise
 * every one of them — recognising only the first is how merchant purges
 * matched 0 of 173 rendered pages and 0 of 17 sitemap feeds on
 * production (2026-09-18) while reporting success.
 *
 * - `nitro:handlers:<name>:<tenantCacheKey after escapeKey>` — the host
 *   reduced to word characters, then {@link TENANT_KEY_DELIMITER}.
 * - `nitro:routes:_:<path>.<hash>:host.<nitroVaryHash(host)>:...` —
 *   route-rule caches (`cache: { varies: ['host', ...] }` in
 *   nuxt.config.ts) carry each vary header as `<name>.<hash(value)>`.
 * - `nitro:functions:<name>:...:<host>:...` — `createCachedFetcher` and
 *   the RSS/loyalty functions key on the raw host, which unstorage keeps
 *   as a `:`-delimited segment (`/` in the URL becomes `:` too).
 *
 * A key in no family, or one whose handler never called `tenantCacheKey`
 * (a deliberately host-agnostic route), belongs to no tenant.
 */
export function cacheKeyBelongsToHost(key: string, host: string): boolean {
  const segments = key.replace(/\.json$/, '').split(':')
  const [, family, , entry] = segments
  switch (family) {
    case 'handlers':
      return entry?.startsWith(
        `${host.replace(/\W/g, '')}${TENANT_KEY_DELIMITER}`,
      ) ?? false
    case 'routes':
      return segments.includes(`host.${nitroVaryHash(host)}`)
    case 'functions':
      return `:${segments.join(':')}:`.includes(`:${host}:`)
    default:
      return false
  }
}
