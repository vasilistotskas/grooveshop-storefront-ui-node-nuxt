import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it } from 'vitest'
import { BROWSER_ACCEPT, requestWithHost, sendJson } from '../helpers/e2e'

/**
 * Does a failed `/api` call tell the browser which request it was?
 *
 * The id evlog gives a request is the `X-Correlation-ID` Django receives,
 * so returning it as `x-request-id` lets a report from the browser be
 * followed into the server and Django logs. The header must also stay out
 * of anything shared: a rendered page or a cached API answer is replayed to
 * many visitors, and an id belongs to ONE request.
 *
 * Only a real server shows the last two: the cache records the headers of
 * its own inner event, and the error handler writes its own response, so
 * this drives real requests through the real cache and error handler.
 *
 * Registered by test/e2e/storefront.spec.ts, on the dev server every e2e
 * suite shares; the harness is test/helpers/e2e.ts.
 */

const HOST = 'request-id.localhost'
const JSON_HEADERS = { 'Content-Type': 'application/json', 'Accept': 'application/json' }

/** HOST's upstream: Django refuses a view count with a 400; everything else falls through to the page-render stub. */
export function requestIdUpstream(req: IncomingMessage, res: ServerResponse, url: URL): boolean {
  if (req.headers['x-forwarded-host'] !== HOST) return false
  if (url.pathname.endsWith('/update_view_count')) {
    sendJson(res, { detail: 'No views today.' }, 400)
    return true
  }
  return false
}

const UUID = /^[0-9a-f-]{16,}$/i

export function describeRequestId(): void {
  describe('the request id on /api responses', () => {
    it('answers a successful call with its id, and a new id for every call', async () => {
      const first = await requestWithHost('/api/_alive', HOST, JSON_HEADERS)
      const second = await requestWithHost('/api/_alive', HOST, JSON_HEADERS)

      expect(first.headers['x-request-id']).toMatch(UUID)
      expect(second.headers['x-request-id']).toMatch(UUID)
      expect(second.headers['x-request-id']).not.toBe(first.headers['x-request-id'])
    })

    it('answers a failed call with its id too, beside the error body', async () => {
      const response = await requestWithHost('/api/blog/posts/7/update-view-count', HOST, JSON_HEADERS, { method: 'POST', body: '{}' })

      expect(response.statusCode).toBe(400)
      expect(response.headers['x-request-id']).toMatch(UUID)
      expect(JSON.parse(response.body)).toMatchObject({ data: { detail: 'No views today.' } })
    })

    it('gives each visitor of a cached API answer their own id, never the one that filled the cache', async () => {
      const filling = await requestWithHost('/api/settings/public', HOST, JSON_HEADERS)
      const replayed = await requestWithHost('/api/settings/public', HOST, JSON_HEADERS)

      expect(filling.statusCode).toBe(200)
      expect(replayed.statusCode).toBe(200)
      expect(replayed.headers['x-request-id']).toMatch(UUID)
      expect(replayed.headers['x-request-id']).not.toBe(filling.headers['x-request-id'])
    })

    it('puts no id on a rendered page, which Nitro and Cloudflare replay to everyone', async () => {
      const page = await requestWithHost('/', HOST, BROWSER_ACCEPT)
      const replayed = await requestWithHost('/', HOST, BROWSER_ACCEPT)

      expect(page.statusCode).toBe(200)
      expect(page.headers['x-request-id']).toBeUndefined()
      expect(replayed.headers['x-request-id']).toBeUndefined()
    })
  })
}
