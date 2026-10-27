/**
 * Cloudflare edge caching of storefront pages.
 *
 * Only a response Nitro itself served from its page cache (an SWR route
 * rule or a custom page, see ``shared/constants/prerender.ts``) may be
 * cached at the edge:
 * those renders are anonymous by construction, carry no per-request CSP
 * nonce, and are already replayed to every visitor, signed in or not, so
 * the edge needs no cookie rule. Every other page says ``private`` — the
 * Cloudflare Cache Rule makes storefront pages *eligible* and uses the
 * origin's headers, so such a response is never stored.
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
// Nitro response-hook code (server/plugins/edge-cache.ts): it reads the
// h3 event Nitro 2 hands its hooks, so it uses h3's own helpers.
import { getResponseHeader, getResponseStatus } from 'h3'
import type { H3Event } from 'h3'

export const EDGE_CACHE_TAG = 'storefront-html'

/** Fresh at the edge for a minute; served stale for up to a day while it refreshes. */
export const EDGE_CACHE_CONTROL = 'max-age=60, stale-while-revalidate=86400'

export function edgeCacheTenantTag(schemaName: string): string {
  return `${EDGE_CACHE_TAG}-${schemaName}`
}

/**
 * Every other page response: a page rendered with the visitor's session
 * (account, cart, checkout), and an error on any route; and every ``/api``
 * answer that states no caching of its own (``isPrivateApiResponse``).
 * ``private`` keeps it out of every shared cache, Cloudflare included,
 * and ``no-store`` keeps it off the browser's disk.
 *
 * It also replaces the header Nitro puts on an error from a cached route.
 * Nitro never keeps a status of 400 or more itself, but it still stamps
 * ``s-maxage`` on the response, and Cloudflare kept that 404 at the edge
 * for ten minutes with no ``Cache-Tag``, so no purge could reach it.
 */
export const PRIVATE_CACHE_CONTROL = 'private, no-store'

const EDGE_CACHEABLE_TYPES = ['text/html', 'application/json']

const PAYLOAD_SUFFIX = /\/_payload\.json$/

function requestPath(event: H3Event): string {
  return event.path.split('?')[0] ?? ''
}

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
  if (!isCachedSsrRoute(requestPath(event).replace(PAYLOAD_SUFFIX, '') || '/')) return false
  if (status === 304) return true
  const type = String(getResponseHeader(event, 'content-type') ?? '')
  return EDGE_CACHEABLE_TYPES.some(allowed => type.startsWith(allowed))
}

/**
 * Whether this response is a page (an HTML document or the payload a
 * client-side navigation fetches) that ``isEdgeCacheableResponse``
 * refused, and so gets ``PRIVATE_CACHE_CONTROL``. Redirects and
 * revalidations keep their own headers.
 */
export function isPrivatePageResponse(event: H3Event): boolean {
  const method = event.method
  if (method !== 'GET' && method !== 'HEAD') return false
  const status = getResponseStatus(event)
  if (status >= 300 && status < 400) return false
  if (PAYLOAD_SUFFIX.test(requestPath(event))) return true
  return String(getResponseHeader(event, 'content-type') ?? '').startsWith('text/html')
}

/**
 * Whether this is an answer from the storefront's own ``/api`` that gets
 * ``PRIVATE_CACHE_CONTROL``: every error, whatever header Nitro stamped
 * on it, and every success that states no caching of its own. A route
 * that does (an icon, the sitemap source, a cached route's ``s-maxage``)
 * keeps its header; redirects keep theirs.
 *
 * Without a ``Cache-Control`` a browser may keep a 404 or a 410 and
 * replay it without asking (RFC 9111, heuristic freshness). On 2026-10-27
 * an iPhone replayed the 410 of a session that had expired two days
 * earlier on every sign-in, which signed the shopper out each time.
 */
export function isPrivateApiResponse(event: H3Event): boolean {
  const method = event.method
  if (method !== 'GET' && method !== 'HEAD') return false
  const path = requestPath(event)
  if (path !== '/api' && !path.startsWith('/api/')) return false
  const status = getResponseStatus(event)
  if (status >= 300 && status < 400) return false
  return status >= 400 || getResponseHeader(event, 'cache-control') === undefined
}
