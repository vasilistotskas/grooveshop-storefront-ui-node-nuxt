import { setResponseStatus } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'

/**
 * How long a crawler is asked to wait before it fetches an incomplete
 * sitemap again: long enough for a Django outage to pass, short enough
 * that the store's pages are not out of the sitemap for long.
 */
export const SITEMAP_RETRY_AFTER_SECONDS = 300

/**
 * Mark the `/sitemap.xml` response as built from a read that failed: a
 * missing list of posts or products (`storeSitemapUrls`), or a gate that
 * could not say which legal and brand pages the store has
 * (`server/plugins/sitemap-tenant-gate.ts`).
 *
 * Such a sitemap must reach no cache. The `/sitemap.xml` route rule keeps
 * a response for a day, and Nitro keeps only one below 400, so the
 * response answers 503 with a `Retry-After`: the route rule keeps the
 * last good sitemap it holds (and serves it while it refreshes), the
 * edge and the browser keep nothing (`server/plugins/edge-cache.ts`
 * marks an error `private, no-store`), and a crawler comes back later
 * rather than reading the store's pages as gone.
 */
export function markSitemapIncomplete(event: RequestEvent): void {
  setResponseStatus(event, 503)
  event.res.headers.set('retry-after', String(SITEMAP_RETRY_AFTER_SECONDS))
}
