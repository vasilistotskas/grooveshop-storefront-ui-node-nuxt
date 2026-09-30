import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/shipping/options.get'
import { zListShippingOptionsResponse } from '~~/shared/openapi/zod.gen'
import { backend, cacheOptionsOf, callRoute, createTestEvent } from '~~/test/helpers/nitro'

/**
 * GET /api/shipping/options: the checkout's per-carrier shipping prices,
 * quoted for the cart's country, value, currency and weight — each of
 * which therefore keys the one-minute cache.
 */

const route = '/api/shipping/options'

const option = {
  providerCode: 'acs',
  providerName: 'ACS',
  kind: 'home_delivery',
  price: 3.5,
  currency: 'EUR',
  liveMode: true,
  priority: 1,
  countryCode: 'GR',
  maxWeightGrams: null,
  exceedsMaxWeight: false,
  metadata: {},
  payWays: [],
}

describe('GET /api/shipping/options', () => {
  it('uses a response fixture the generated schema accepts', () => {
    expect(zListShippingOptionsResponse.safeParse([option]).success).toBe(true)
  })

  it('asks Django for the options quoted for the cart, as the caller\'s store', async () => {
    backend.reply([option])

    const response = await callRoute(handler, {
      route,
      url: `${route}?countryCode=GR&orderValueAmount=42.50&currency=EUR&weightGrams=1200`,
      headers: { 'x-forwarded-host': 'evil.example' },
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual([option])
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/shipping/options')
    expect(backend.lastRequest.query).toEqual({ countryCode: 'GR', orderValueAmount: '42.50', currency: 'EUR', weightGrams: '1200' })
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('answers 400 without a country', async () => {
    const response = await callRoute(handler, { route, url: `${route}?weightGrams=1200` })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('answers 422 when the quote drifts from the contract', async () => {
    backend.reply([{ ...option, price: 'free' }])

    const response = await callRoute(handler, { route, url: `${route}?countryCode=GR` })

    expect(response.status).toBe(422)
  })

  it.each(['countryCode=CY', 'orderValueAmount=99', 'currency=USD', 'weightGrams=5000'])(
    'gives a quote differing only in %s its own cache entry',
    async (param) => {
      const { getKey } = cacheOptionsOf(handler)
      const base = 'countryCode=GR&orderValueAmount=10&currency=EUR&weightGrams=100'
      const changed = new URLSearchParams(base)
      const [name, value] = param.split('=') as [string, string]
      changed.set(name, value)

      const baseKey = await getKey!(createTestEvent({ url: `${route}?${base}` }))
      const changedKey = await getKey!(createTestEvent({ url: `${route}?${changed}` }))

      expect(changedKey).not.toBe(baseKey)
    },
  )
})
