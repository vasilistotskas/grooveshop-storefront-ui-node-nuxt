/**
 * Cloudflare edge caching of storefront pages.
 *
 * Only a response Nitro itself served from its page cache (an SWR route
 * rule, see ``shared/constants/prerender.ts``) may be cached at the edge:
 * those renders are anonymous by construction, carry no per-request CSP
 * nonce, and are already replayed to every visitor. Every other response
 * keeps the default of not being cached — the Cloudflare Cache Rule makes
 * storefront pages *eligible* and uses the origin's headers, so a response
 * without them is never stored.
 *
 * The edge directive travels in ``Cloudflare-CDN-Cache-Control``, which
 * Cloudflare consumes and strips, so browsers get their own
 * ``Cache-Control``. It is not ``s-maxage``: that implies
 * ``proxy-revalidate`` and switches off Cloudflare's asynchronous
 * stale-while-revalidate. Browsers get ``no-cache``: they revalidate
 * against the edge (a 304 from cache), so a deploy never leaves a
 * browser holding HTML whose ``/_nuxt`` chunks no longer exist.
 *
 * ``Cache-Tag`` is the purge handle, and its names are a contract with
 * Django (``core/cache/edge.py``): one tag for every storefront page (the
 * post-deploy purge) and one per tenant (a merchant's own edit).
 */
import type { H3Event } from 'h3'

export const EDGE_CACHE_TAG = 'storefront-html'

/** Fresh at the edge for a minute; served stale for up to a day while it refreshes. */
export const EDGE_CACHE_CONTROL = 'max-age=60, stale-while-revalidate=86400'

export function edgeCacheTenantTag(schemaName: string): string {
  return `${EDGE_CACHE_TAG}-${schemaName}`
}

const EDGE_CACHEABLE_TYPES = ['text/html', 'application/json']

/**
 * Whether this response may be stored at the edge. The ``s-maxage``
 * test is how Nitro marks a response its SWR page cache produced — on a
 * render and on a replay alike (``nitropack`` ``runtime/internal/cache``).
 */
export function isEdgeCacheableResponse(event: H3Event): boolean {
  const method = event.method
  if (method !== 'GET' && method !== 'HEAD') return false
  const status = getResponseStatus(event)
  if (status !== 200 && status !== 304) return false
  if (!event.context.tenant) return false
  if (!/(?:^|[\s,])s-maxage=\d+/.test(String(getResponseHeader(event, 'cache-control') ?? ''))) return false
  const path = event.path.split('?')[0] ?? ''
  if (!isCachedSsrRoute(path.replace(/\/_payload\.json$/, '') || '/')) return false
  if (status === 304) return true
  const type = String(getResponseHeader(event, 'content-type') ?? '')
  return EDGE_CACHEABLE_TYPES.some(allowed => type.startsWith(allowed))
}
