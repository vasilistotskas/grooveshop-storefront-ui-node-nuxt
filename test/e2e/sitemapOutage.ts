import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it } from 'vitest'
import { requestWithHost, sendJson } from '../helpers/e2e'

/**
 * Does a sitemap built while Django fails stay out of every cache?
 *
 * The store's URLs are read inside the `/sitemap.xml` request
 * (`server/plugins/sitemap-store-urls.ts`), and a read that fails marks
 * the response 503 (`markSitemapIncomplete`). Only a real server shows
 * that the status survives @nuxtjs/sitemap and the `/sitemap.xml` route
 * rule, and that the next request after Django recovers builds the full
 * sitemap rather than replaying the incomplete one: the unit tests drive
 * the hook alone.
 *
 * Registered by test/e2e/storefront.spec.ts, on the dev server every e2e
 * suite shares; the harness is test/helpers/e2e.ts.
 */

const HOST = 'sitemap-outage.localhost'
const POST = { id: 41, slug: 'after-the-outage', updatedAt: '2026-11-01T08:00:00Z' }

/** Whether HOST's blog post list fails, as during a Django outage. */
let postsDown = true

/** HOST's upstream: the blog post list, failing while `postsDown`; everything else falls through to the page-render stub. */
export function sitemapOutageUpstream(req: IncomingMessage, res: ServerResponse, url: URL): boolean {
  if (req.headers['x-forwarded-host'] !== HOST) return false
  if (url.pathname.endsWith('/blog/post')) {
    if (postsDown) sendJson(res, { detail: 'upstream down' }, 503)
    else sendJson(res, { count: 1, links: { next: null, previous: null }, results: [POST] })
    return true
  }
  return false
}

export function describeSitemapOutage(): void {
  describe('the sitemap during a Django outage', () => {
    it('answers 503 with a Retry-After, cached nowhere, while a read fails; then the full sitemap once Django is back', async () => {
      postsDown = true
      const during = await requestWithHost('/sitemap.xml', HOST)

      expect(during.statusCode).toBe(503)
      expect(during.headers['retry-after']).toBe('300')
      expect(during.headers['cache-control']).toBe('private, no-store')
      expect(during.body).not.toContain(POST.slug)

      postsDown = false
      const after = await requestWithHost('/sitemap.xml', HOST)

      expect(after.statusCode).toBe(200)
      expect(after.body).toContain(`/blog/post/${POST.id}/${POST.slug}`)
    })
  })
}
