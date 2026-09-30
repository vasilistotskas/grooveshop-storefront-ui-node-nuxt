import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/promotions/product/[productId].get'
import { backend, cacheOptionsOf, callRoute, createTestEvent, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/promotions/product/:productId'

describe('GET /api/promotions/product/[productId]', () => {
  it('asks Django for one product\'s offers in the page language, on the request\'s store', async () => {
    backend.reply([])

    const response = await callRoute(handler, {
      route,
      url: '/api/promotions/product/2?languageCode=en',
      headers: { 'x-forwarded-host': 'evil.example' },
    })

    expect(response.status).toBe(200)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/promotion/product/2')
    expect(backend.lastRequest.query).toEqual({ languageCode: 'en' })
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('rejects a non-numeric product id without calling the backend', async () => {
    const response = await callRoute(handler, { route, url: '/api/promotions/product/two' })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('propagates Django\'s 404 for a missing product or switched-off promotions', async () => {
    backend.reply(jsonResponse({ detail: 'Not found.' }, 404))

    const response = await callRoute(handler, { route, url: '/api/promotions/product/2' })

    expect(response.status).toBe(404)
  })

  it('keys the cache by product and language', async () => {
    const { getKey } = cacheOptionsOf(handler)
    const keyFor = (productId: string, languageCode: string) => getKey!(createTestEvent({
      url: `/api/promotions/product/${productId}?languageCode=${languageCode}`,
      context: { params: { productId } },
    }))

    const base = await keyFor('2', 'el')

    expect(base).toContain('promotions:product:2:el')
    expect(await keyFor('3', 'el')).not.toBe(base)
    expect(await keyFor('2', 'en')).not.toBe(base)
    expect(await keyFor('2', 'el')).toBe(base)
  })
})
