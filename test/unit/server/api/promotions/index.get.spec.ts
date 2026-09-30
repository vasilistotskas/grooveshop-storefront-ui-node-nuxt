import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/promotions/index.get'
import { backend, cacheOptionsOf, callRoute, createTestEvent, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/promotions'

describe('GET /api/promotions', () => {
  it('asks Django for the offers in the language the page named, on the request\'s store', async () => {
    backend.reply([])

    const response = await callRoute(handler, {
      route,
      url: '/api/promotions?languageCode=en',
      headers: { 'x-forwarded-host': 'evil.example' },
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual([])
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/promotion')
    expect(backend.lastRequest.query).toEqual({ languageCode: 'en' })
    // Promotion rows are per-tenant: without the request's own host
    // Django answers from the public schema.
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('rejects a language the platform does not serve — it would mint cache entries', async () => {
    const response = await callRoute(handler, { route, url: '/api/promotions?languageCode=xx' })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('propagates the 404 Django answers when promotions are switched off', async () => {
    backend.reply(jsonResponse({ detail: 'Not found.' }, 404))

    const response = await callRoute(handler, { route, url: '/api/promotions' })

    expect(response.status).toBe(404)
  })

  it('keys the cache by language', async () => {
    // `/en/offers` rendered Greek cards when the language never reached
    // Django; one entry per tenant would put that back.
    const { getKey } = cacheOptionsOf(handler)
    const keyFor = (url: string) => getKey!(createTestEvent({ url }))

    const greek = await keyFor('/api/promotions?languageCode=el')
    const english = await keyFor('/api/promotions?languageCode=en')

    expect(greek).not.toBe(english)
    expect(english).toBe(await keyFor('/api/promotions?languageCode=en'))
    expect(english).toContain('promotions:public:en')
  })
})
