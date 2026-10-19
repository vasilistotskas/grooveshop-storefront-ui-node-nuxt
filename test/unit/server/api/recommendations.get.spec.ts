import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/recommendations.get'
import { makeProduct } from '~~/test/fixtures/product'
import { backend, cacheOptionsOf, callRoute, createTestEvent, jsonResponse } from '~~/test/helpers/nitro'

/**
 * GET /api/recommendations: a surface's store-wide suggestions, for the
 * one surface with no seed product — the empty cart. Cached under the
 * product route's handler name, which Django's `recommendations` cache
 * surface purges.
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

  it('forwards no seed even when one is passed: a seeded surface has its own route', async () => {
    backend.reply(suggestions)

    await callRoute(handler, { route, url: '/api/recommendations?surface=empty_cart&seed=4&seeds=5,6' })

    expect(backend.lastRequest.query).toEqual({ surface: 'empty_cart' })
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
})
