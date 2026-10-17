// Nitro page-cache code (server/plugins/tracking-params.ts): it rewrites
// the h3 v1 event Nitro's router and cache handler read, so it uses h3's
// own types rather than `nuxt/server`'s portable view of the event.
import type { H3Event } from 'h3'

const PAYLOAD_SUFFIX = /\/_payload\.json$/

/**
 * Drop the ad and campaign tags (`shared/constants/trackingParams.ts`)
 * from the request a CACHED page route is about to be answered for.
 *
 * Nitro keys a cached page on `req.originalUrl` and renders it from
 * `req.url`, so every `?gclid=…` was its own cache entry and its own full
 * render, and the click id rode into the cached HTML (`payload.path`,
 * pagination links) for the next visitor. With the tags gone from both,
 * `/products?gclid=a` and `/products?gclid=b` are one entry whose render
 * never saw a tag. The browser's address bar is untouched
 * (`app/plugins/tracking-location.client.ts`).
 *
 * Only a GET or HEAD for a route whose response Nitro replays from its
 * cache: any other response is rendered per request and never shared, so
 * leaving its URL alone costs nothing and changes nothing (a redirect
 * keeps the visitor's whole query, the order attribution reads it from
 * the landing URL). Runs after every middleware for the same reason: the
 * www and canonical-host redirects see the full URL.
 */
export function stripTrackingParamsFromCachedRoute(event: H3Event): void {
  if (event.method !== 'GET' && event.method !== 'HEAD') return

  const clean = withoutTrackingParams(event.path)
  if (clean === event.path) return

  const pathname = (clean.split('?', 1)[0] ?? '').replace(PAYLOAD_SUFFIX, '') || '/'
  if (!isCachedSsrRoute(pathname)) return

  // `_path` and `req.url` are what h3's router and the renderer read,
  // `originalUrl` is what the cache key hashes (nitropack
  // `runtime/internal/cache`); Nuxt's own `event.url` setter writes the
  // first two the same way.
  event._path = event.node.req.url = event.node.req.originalUrl = clean
}
