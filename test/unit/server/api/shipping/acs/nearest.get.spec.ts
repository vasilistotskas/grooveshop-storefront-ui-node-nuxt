import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/shipping/acs/nearest.get'
import { backend, cacheOptionsOf, callRoute, createTestEvent, log } from '~~/test/helpers/nitro'

/**
 * GET /api/shipping/acs/nearest: the ACS Smartpoint lockers nearest a
 * postcode, for the checkout's list picker; cached per postcode, city,
 * locker kind and country.
 */

const route = '/api/shipping/acs/nearest'

describe('GET /api/shipping/acs/nearest', () => {
  it('asks Django for the lockers near the postcode, as the caller\'s store', async () => {
    backend.reply([])

    const response = await callRoute(handler, {
      route,
      url: `${route}?postalCode=54622&city=Thessaloniki&shopKind=7&countryCode=GR`,
      headers: { 'x-forwarded-host': 'evil.example' },
    })

    expect(response.status).toBe(200)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/shipping/acs/stations/nearest')
    expect(backend.lastRequest.query).toEqual({ postalCode: '54622', city: 'Thessaloniki', shopKind: '7', countryCode: 'GR' })
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('answers 422 and reports it when the lockers drift from the contract', async () => {
    backend.reply([{ id: 'not-a-station' }])

    const response = await callRoute(handler, { route, url: `${route}?postalCode=54622` })

    expect(response.status).toBe(422)
    // `handleError` is what reports a drifted response loudly; a parse
    // rejection that escapes the try reached the client as the same 422
    // and was never logged.
    expect(log.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'validation:response' }))
  })

  it.each([
    ['a postcode shorter than three characters', 'postalCode=54'],
    ['a non-numeric locker kind', 'postalCode=54622&shopKind=big'],
    ['a country that is not two letters', 'postalCode=54622&countryCode=GRC'],
  ])('answers 400 for %s without calling Django', async (_label, query) => {
    const response = await callRoute(handler, { route, url: `${route}?${query}` })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it.each(['postalCode=10431', 'city=Athens', 'shopKind=8', 'countryCode=CY'])(
    'gives a lookup differing only in %s its own cache entry',
    async (param) => {
      const { getKey } = cacheOptionsOf(handler)
      const base = 'postalCode=54622&city=Thessaloniki&shopKind=7&countryCode=GR'
      const changed = new URLSearchParams(base)
      const [name, value] = param.split('=') as [string, string]
      changed.set(name, value)

      expect(await getKey!(createTestEvent({ url: `${route}?${changed}` })))
        .not.toBe(await getKey!(createTestEvent({ url: `${route}?${base}` })))
    },
  )
})
