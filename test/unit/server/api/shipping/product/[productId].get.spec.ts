import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/shipping/product/[productId].get'
import { backend, cacheOptionsOf, callRoute, createTestEvent, jsonResponse } from '~~/test/helpers/nitro'
import { makeProductShipping } from '~~/test/fixtures/productShipping'

const route = '/api/shipping/product/:productId'
const priced = makeProductShipping()

describe('GET /api/shipping/product/[productId]', () => {
  it('asks Django what shipping one product costs, on the request\'s store', async () => {
    backend.reply(priced)

    const response = await callRoute(handler, {
      route,
      url: '/api/shipping/product/2',
      headers: { 'x-forwarded-host': 'evil.example' },
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(priced)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/shipping/product/2')
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('passes on a product Django has no price for', async () => {
    backend.reply(makeProductShipping(null))

    const response = await callRoute(handler, { route, url: '/api/shipping/product/2' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(makeProductShipping(null))
  })

  it('rejects a non-numeric product id without calling the backend', async () => {
    const response = await callRoute(handler, { route, url: '/api/shipping/product/two' })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('propagates Django\'s 404 for a missing or inactive product', async () => {
    backend.reply(jsonResponse({ detail: 'Not found.' }, 404))

    const response = await callRoute(handler, { route, url: '/api/shipping/product/2' })

    expect(response.status).toBe(404)
  })

  it('answers 422 when the backend payload drifts from the contract', async () => {
    backend.reply({ estimate: { countryCode: 'GR' } })

    const response = await callRoute(handler, { route, url: '/api/shipping/product/2' })

    expect(response.status).toBe(422)
  })

  // Django's shipping, products and promotions surfaces purge `shipping.product`.
  it('is cached per store and product under the name Django purges', async () => {
    const { name, getKey } = cacheOptionsOf(handler)
    const keyFor = (productId: string) => getKey!(createTestEvent({
      url: `/api/shipping/product/${productId}`,
      context: { params: { productId } },
    }))

    expect(name).toBe('shipping.product')
    const base = await keyFor('2')
    expect(base.startsWith('shop.test__el__shipping-product:2')).toBe(true)
    expect(await keyFor('3')).not.toBe(base)
  })
})
