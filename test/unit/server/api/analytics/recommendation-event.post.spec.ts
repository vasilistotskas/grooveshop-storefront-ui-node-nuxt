import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/analytics/recommendation-event.post'
import { backend, callRoute, testSession, useStorage } from '~~/test/helpers/nitro'

/**
 * POST /api/analytics/recommendation-event: forwards a recommendation
 * strip's impression/click to Django with the cart's identity — the same
 * one a later add-to-cart is attributed to — behind a per-store, per-IP
 * limit of 60 a minute.
 */

const route = '/api/analytics/recommendation-event'
const CART_UUID = '6f1c1d8e-2a4b-4c3d-9e8f-0a1b2c3d4e5f'
const recommendationEvent = {
  impressionId: '0f8fad5b-d9cb-469f-a165-70867728950e',
  surface: 'pdp',
  kind: 'click',
  seedId: 4,
  items: [{ productId: 9, strategy: 'co_view', position: 0 }],
}

const report = (body: unknown = recommendationEvent) => callRoute(handler, {
  route,
  method: 'POST',
  body,
  headers: { 'cf-connecting-ip': '203.0.113.9', 'cookie': `cart-id=${CART_UUID}` },
})

describe('POST /api/analytics/recommendation-event', () => {
  it('forwards the event with the cart\'s identity and answers 202', async () => {
    testSession.set({ secure: { accessToken: 'knox-1' } })
    backend.reply({ detail: 'ok' })

    const response = await report()

    expect(response.status).toBe(202)
    const sent = backend.lastRequest
    expect(sent.method).toBe('POST')
    expect(sent.path).toBe('http://backend.test/api/v1/recommendations/events')
    expect(sent.body).toEqual(recommendationEvent)
    expect(sent.headers.get('x-cart-id')).toBe(CART_UUID)
    expect(sent.headers.get('authorization')).toBe('Bearer knox-1')
  })

  it('rejects an event with an unknown surface without calling Django', async () => {
    const response = await report({ ...recommendationEvent, surface: 'homepage' })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('refuses the 61st event from one IP on the store', async () => {
    await useStorage('cache').setItem('rate:recommendation-event:shop.test:203.0.113.9', 60)

    const response = await report()

    expect(response.status).toBe(429)
    expect(backend.requests).toEqual([])
  })
})
