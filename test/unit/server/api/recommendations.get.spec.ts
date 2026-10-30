import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/recommendations.get'
import { makeProduct } from '~~/test/fixtures/product'
import { backend, cacheOptionsOf, callRoute, createTestEvent, jsonResponse } from '~~/test/helpers/nitro'

/**
 * GET /api/recommendations: a surface's suggestions with no seed product —
 * the empty cart — or for a basket of seeds, the cart's product ids. Cached
 * under the product route's handler name, which Django's `recommendations`
 * cache surface purges.
 */

const route = '/api/recommendations'
const suggestions = {
  surface: 'empty_cart',
  impressionId: '0f8fad5b-d9cb-469f-a165-70867728950e',
  items: [{ product: makeProduct({ id: 7 }), reason: { strategy: 'popular', relationType: null, score: 0.5 } }],
}

describe('GET /api/recommendations', () => {
  it('asks Django for the surface with no seed, for the store the request is on', async () => {
    backend.reply(suggestions)

    const response = await callRoute(handler, {
      route,
      url: '/api/recommendations?surface=empty_cart&limit=6',
      headers: { 'x-forwarded-host': 'evil.example' },
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(suggestions)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/recommendations')
    expect(backend.lastRequest.query).toEqual({ surface: 'empty_cart', limit: '6' })
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('forwards no single seed even when one is passed: a product has its own route', async () => {
    backend.reply(suggestions)

    await callRoute(handler, { route, url: '/api/recommendations?surface=empty_cart&seed=4' })

    expect(backend.lastRequest.query).toEqual({ surface: 'empty_cart' })
  })

  it('forwards the basket\'s seeds sorted and without repeats, so one basket has one answer', async () => {
    backend.reply(suggestions)

    await callRoute(handler, { route, url: '/api/recommendations?surface=cart&limit=2&seeds=9,4,9,12' })

    expect(backend.lastRequest.query).toEqual({ surface: 'cart', limit: '2', seeds: '4,9,12' })
  })

  it.each(['1,,2', '01,2', '1,a', '0', '-3', ',4', '4,'])('refuses the malformed seeds "%s" without calling Django', async (seeds) => {
    const response = await callRoute(handler, { route, url: `/api/recommendations?surface=cart&seeds=${seeds}` })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('rejects an unknown surface without calling Django', async () => {
    const response = await callRoute(handler, { route, url: '/api/recommendations?surface=homepage' })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('passes Django refusing a surface that needs a seed through', async () => {
    backend.reply(jsonResponse({ seed: ['A seed product is required for this surface.'] }, 400))

    const response = await callRoute(handler, { route, url: '/api/recommendations?surface=pdp' })

    expect(response.status).toBe(400)
  })

  it('answers 422 when the backend payload drifts from the contract', async () => {
    backend.reply({ surface: 'empty_cart', items: [] })

    const response = await callRoute(handler, { route, url: '/api/recommendations?surface=empty_cart' })

    expect(response.status).toBe(422)
  })

  it('is cached under the name Django purges, keyed by surface and limit', async () => {
    const { name, getKey } = cacheOptionsOf(handler)
    const keyFor = (url: string) => getKey!(createTestEvent({ url }))

    expect(name).toBe('productRecommendations')
    const emptyCart = await keyFor('/api/recommendations?surface=empty_cart')
    expect(emptyCart.startsWith('shop.test__el__recommendations:store:')).toBe(true)
    expect(await keyFor('/api/recommendations?surface=empty_cart&limit=3')).not.toBe(emptyCart)
    expect(await keyFor('/api/recommendations?surface=pdp')).not.toBe(emptyCart)
  })

  it('keys a basket by its sorted seeds: the same products in any order share an entry, other products do not', async () => {
    const { getKey } = cacheOptionsOf(handler)
    const keyFor = (url: string) => getKey!(createTestEvent({ url }))

    const basket = await keyFor('/api/recommendations?surface=cart&seeds=4,9')
    expect(await keyFor('/api/recommendations?surface=cart&seeds=9,4,4')).toBe(basket)
    expect(await keyFor('/api/recommendations?surface=cart&seeds=4,10')).not.toBe(basket)
    expect(await keyFor('/api/recommendations?surface=cart')).not.toBe(basket)
    // A malformed list is refused by the handler; it takes no real basket's entry.
    expect(await keyFor('/api/recommendations?surface=cart&seeds=4,,9')).not.toBe(basket)
  })
})
