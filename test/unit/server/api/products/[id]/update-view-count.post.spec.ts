import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/products/[id]/update-view-count.post'
import { zIncrementProductViewsResponse } from '~~/shared/openapi/zod.gen'
import type { ProductDetail } from '~~/shared/openapi/types.gen'
import { makeProduct } from '~~/test/fixtures/product'
import { backend, callRoute } from '~~/test/helpers/nitro'

/**
 * POST /api/products/[id]/update-view-count.
 *
 * Django throttles view counting per visitor (`ViewCountThrottle`). A bare
 * `$fetch` reaches it as this pod — no visitor User-Agent or IP — which
 * puts every anonymous visitor in one bucket and silently stops the
 * counter once it fills. `useBackendFetch()` relays the visitor's
 * identity, so the request Django sees must carry it.
 */

const route = '/api/products/:id/update-view-count'

/** Django answers with the product DETAIL: the list shape plus its alert flag. */
const detail = (overrides: Partial<ProductDetail> = {}): ProductDetail =>
  ({ ...makeProduct({ id: 42 }), priceDropAlertsEnabled: false, ...overrides })
const VISITOR = { 'user-agent': 'Mozilla/5.0 (iPhone) Safari/604.1', 'cf-connecting-ip': '203.0.113.9' }

const view = (id = '42') => callRoute(handler, {
  route,
  url: `/api/products/${id}/update-view-count`,
  method: 'POST',
  headers: VISITOR,
})

describe('POST /api/products/[id]/update-view-count', () => {
  it('uses a response fixture the generated schema accepts', () => {
    expect(zIncrementProductViewsResponse.safeParse(detail()).success).toBe(true)
  })

  it('counts the view at Django as the visitor, not as this pod', async () => {
    backend.reply(detail({ viewCount: 7 }))

    const response = await view()

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: 42, viewCount: 7 })
    const sent = backend.lastRequest
    expect(sent.method).toBe('POST')
    expect(sent.path).toBe('http://backend.test/api/v1/product/42/update_view_count')
    expect(sent.headers.get('user-agent')).toBe(VISITOR['user-agent'])
    expect(sent.headers.get('x-real-ip')).toBe(VISITOR['cf-connecting-ip'])
  })

  it('rejects a non-numeric product id without calling Django', async () => {
    const response = await view('abc')

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })
})
