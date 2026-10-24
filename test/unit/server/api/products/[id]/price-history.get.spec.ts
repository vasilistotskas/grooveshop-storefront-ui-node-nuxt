import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/products/[id]/price-history.get'
import { backend, cacheOptionsOf, callRoute, createTestEvent, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/products/:id/price-history'
const history = {
  currency: 'EUR',
  spells: [
    { validFrom: '2026-08-21T18:20:28+03:00', validTo: '2026-09-21T18:20:28+03:00', price: 49.48 },
    { validFrom: '2026-09-21T18:20:28+03:00', validTo: null, price: 39.58 },
  ],
}

describe('GET /api/products/[id]/price-history', () => {
  it('fetches the product\'s price history for the store the request is on', async () => {
    backend.reply(history)

    const response = await callRoute(handler, {
      route,
      url: '/api/products/43/price-history',
      headers: { 'x-forwarded-host': 'evil.example' },
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(history)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/product/43/price-history')
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('rejects a non-numeric product id without calling the backend', async () => {
    const response = await callRoute(handler, { route, url: '/api/products/abc/price-history' })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('answers 422 when the backend payload drifts from the contract', async () => {
    backend.reply({ currency: 'EUR' })

    const response = await callRoute(handler, { route, url: '/api/products/43/price-history' })

    expect(response.status).toBe(422)
  })

  // Django's answer with the store's price history switched off.
  it('passes an upstream 404 through', async () => {
    backend.reply(jsonResponse({ detail: 'Not found.' }, 404))

    const response = await callRoute(handler, { route, url: '/api/products/43/price-history' })

    expect(response.status).toBe(404)
  })

  // Django purges `product-price-history` with the products surface.
  it('is cached under the name Django purges, keyed by product', async () => {
    const { name, getKey } = cacheOptionsOf(handler)
    const keyFor = (id: string) => getKey!(createTestEvent({ context: { params: { id } } }))

    expect(name).toBe('product-price-history')
    expect(await keyFor('43')).not.toBe(await keyFor('44'))
    expect((await keyFor('43')).startsWith('shop.test__el__product-price-history:43')).toBe(true)
  })
})
