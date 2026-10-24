import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/shipping/policy.get'
import { backend, cacheOptionsOf, callRoute, createTestEvent } from '~~/test/helpers/nitro'

const route = '/api/shipping/policy'
const policy = [{
  countryCode: 'GR',
  kind: 'home_delivery',
  providerCode: 'acs',
  providerName: 'ACS Courier',
  price: 2.99,
  currency: 'EUR',
  freeShippingThreshold: 40,
  deliveryDaysMin: null,
  deliveryDaysMax: null,
  maxWeightGrams: null,
}]

describe('GET /api/shipping/policy', () => {
  it('fetches the shipping policy of the store the request is on', async () => {
    backend.reply(policy)

    const response = await callRoute(handler, {
      route,
      url: '/api/shipping/policy',
      headers: { 'x-forwarded-host': 'evil.example' },
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(policy)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/shipping/policy')
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('answers 422 when the backend payload drifts from the contract', async () => {
    backend.reply([{ countryCode: 'GR' }])

    const response = await callRoute(handler, { route, url: '/api/shipping/policy' })

    expect(response.status).toBe(422)
  })

  // Django purges `shipping.policy` with the shipping surface.
  it('is cached per store under the name Django purges', async () => {
    const { name, getKey } = cacheOptionsOf(handler)

    expect(name).toBe('shipping.policy')
    expect((await getKey!(createTestEvent({}))).startsWith('shop.test__el__shipping-policy')).toBe(true)
  })
})
