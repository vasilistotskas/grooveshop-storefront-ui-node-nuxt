import { afterEach, describe, expect, it, vi } from 'vitest'
import handler from '~~/server/api/analytics/recommendation-event.post'
import { backend, callRoute, testSession } from '~~/test/helpers/nitro'

/**
 * POST /api/analytics/recommendation-event: forwards a recommendation
 * strip's impression/click to Django with the cart's identity — the same
 * one a later add-to-cart is attributed to — behind a per-store, per-IP
 * limit of 60 a minute, and answers with the id Django recorded the
 * showing under (minted for an impression that names none).
 */

const route = '/api/analytics/recommendation-event'
const CART_UUID = '6f1c1d8e-2a4b-4c3d-9e8f-0a1b2c3d4e5f'
const SHOWING = '0f8fad5b-d9cb-469f-a165-70867728950e'
const recommendationEvent = {
  impressionId: SHOWING,
  surface: 'pdp',
  kind: 'click',
  seedId: 4,
  items: [{ productId: 9, strategy: 'attributes', position: 0 }],
}
const recorded = { detail: 'ok', impressionId: SHOWING }

const report = (body: unknown = recommendationEvent) => callRoute(handler, {
  route,
  method: 'POST',
  body,
  headers: { 'cf-connecting-ip': '203.0.113.9', 'cookie': `cart-id=${CART_UUID}` },
})

describe('POST /api/analytics/recommendation-event', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('forwards the event with the cart\'s identity and answers 202', async () => {
    testSession.set({ secure: { accessToken: 'knox-1' } })
    backend.reply(recorded)

    const response = await report()

    expect(response.status).toBe(202)
    expect(response.body).toEqual(recorded)
    const sent = backend.lastRequest
    expect(sent.method).toBe('POST')
    expect(sent.path).toBe('http://backend.test/api/v1/recommendations/events')
    expect(sent.body).toEqual(recommendationEvent)
    expect(sent.headers.get('x-cart-id')).toBe(CART_UUID)
    expect(sent.headers.get('authorization')).toBe('Bearer knox-1')
  })

  it('forwards an impression with no id and answers the id Django minted', async () => {
    const minted = '9b2e4c1a-7d3f-4e5b-8a6c-1f2e3d4c5b6a'
    const { impressionId: _, ...impression } = { ...recommendationEvent, kind: 'impression' }
    backend.reply({ detail: 'ok', impressionId: minted })

    const response = await report(impression)

    expect(response.status).toBe(202)
    expect(backend.lastRequest.body).toEqual(impression)
    expect(response.body).toEqual({ detail: 'ok', impressionId: minted })
  })

  it('rejects an event with an unknown surface without calling Django', async () => {
    const response = await report({ ...recommendationEvent, surface: 'homepage' })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('refuses the 61st event from one IP on the store', async () => {
    // The start of a minute: every event of the test falls in one window.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-07T12:00:00Z'))
    backend.reply(recorded)
    for (let i = 0; i < 60; i++) expect((await report()).status).toBe(202)
    const forwarded = backend.requests.length

    const response = await report()

    expect(response.status).toBe(429)
    expect(backend.requests).toHaveLength(forwarded)
  })
})
