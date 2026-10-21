import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/shipping/options.get'
import { zListShippingOptionsResponse } from '~~/shared/openapi/zod.gen'
import { makeShippingOption } from '~~/test/fixtures/shippingOptions'
import { backend, cacheOptionsOf, callRoute, createTestEvent, log, testSession } from '~~/test/helpers/nitro'

/**
 * GET /api/shipping/options: the checkout's per-carrier shipping prices,
 * quoted for the cart's country, value, currency and weight — each of
 * which therefore keys the one-minute cache. Django also flags the
 * options the visitor's cart does not fit, so the request names the
 * cart, and a request that names one is never served from or stored in
 * that cache.
 */

const route = '/api/shipping/options'
const CART_UUID = '6f1c1d8e-2a4b-4c3d-9e8f-0a1b2c3d4e5f'
const query = 'countryCode=GR&orderValueAmount=42.50&currency=EUR&weightGrams=1200'

const option = makeShippingOption({ providerName: 'ACS', price: 3.5, priority: 1 })

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

  it('names a guest\'s cart to Django by the UUID their session carries', async () => {
    backend.reply([option])

    await callRoute(handler, { route, url: `${route}?${query}`, headers: { cookie: `cart-id=${CART_UUID}` } })

    expect(backend.lastRequest.headers.get('x-cart-id')).toBe(CART_UUID)
    expect(backend.lastRequest.headers.has('authorization')).toBe(false)
  })

  it('names a signed-in shopper\'s cart to Django by their access token', async () => {
    testSession.set({ secure: { accessToken: 'knox-1' } })
    backend.reply([option])

    await callRoute(handler, { route, url: `${route}?${query}` })

    expect(backend.lastRequest.headers.get('authorization')).toBe('Bearer knox-1')
    expect(backend.lastRequest.headers.has('x-cart-id')).toBe(false)
  })

  it('names no cart for a visitor without one', async () => {
    backend.reply([option])

    await callRoute(handler, { route, url: `${route}?${query}` })

    expect(backend.lastRequest.headers.has('x-cart-id')).toBe(false)
    expect(backend.lastRequest.headers.has('authorization')).toBe(false)
  })

  describe('the cache', () => {
    const { shouldBypassCache } = cacheOptionsOf(handler)

    it('is skipped by a guest with a cart, whose fit is theirs alone', async () => {
      expect(await shouldBypassCache!(createTestEvent({ url: `${route}?${query}`, headers: { cookie: `cart-id=${CART_UUID}` } })))
        .toBe(true)
    })

    it('is skipped by a signed-in shopper, whose cart Django finds by their token', async () => {
      testSession.set({ secure: { accessToken: 'knox-1' } })

      expect(await shouldBypassCache!(createTestEvent({ url: `${route}?${query}` }))).toBe(true)
    })

    it('serves a visitor without a cart, whose answer is every such visitor\'s', async () => {
      expect(await shouldBypassCache!(createTestEvent({ url: `${route}?${query}` }))).toBe(false)
      expect(testSession.minted).toBe(0)
    })
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
    // `handleError` is what reports a drifted response loudly; a parse
    // rejection that escapes the try reached the client as the same 422
    // and was never logged.
    expect(log.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'validation:response' }))
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
