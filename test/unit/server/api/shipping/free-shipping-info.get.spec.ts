import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/shipping/free-shipping-info.get'
import { zGetFreeShippingInfoResponse } from '~~/shared/openapi/zod.gen'
import { backend, callRoute, log } from '~~/test/helpers/nitro'

/**
 * GET /api/shipping/free-shipping-info: the free-shipping thresholds the
 * product page and the cart quote ("free shipping over X €"), as the
 * caller's store.
 */

const route = '/api/shipping/free-shipping-info'

const VALID = { providers: [], minThreshold: 40, maxThreshold: 60, currency: 'EUR', countryCode: 'GR' }

describe('GET /api/shipping/free-shipping-info', () => {
  it('uses a response fixture the generated schema accepts', () => {
    expect(zGetFreeShippingInfoResponse.safeParse(VALID).success).toBe(true)
  })

  it('asks Django for the thresholds of the country and currency, as the caller\'s store', async () => {
    backend.reply(VALID)

    const response = await callRoute(handler, {
      route,
      url: `${route}?countryCode=GR&currency=EUR`,
      headers: { 'x-forwarded-host': 'evil.example' },
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(VALID)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/shipping/free-shipping-info')
    expect(backend.lastRequest.query).toEqual({ countryCode: 'GR', currency: 'EUR' })
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('answers 422 and reports it when the thresholds drift from the contract', async () => {
    backend.reply({ ...VALID, minThreshold: 'free' })

    const response = await callRoute(handler, { route, url: `${route}?countryCode=GR&currency=EUR` })

    expect(response.status).toBe(422)
    // `handleError` is what reports a drifted response loudly; a parse
    // rejection that escapes the try reached the client as the same 422
    // and was never logged.
    expect(log.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'validation:response' }))
  })
})
