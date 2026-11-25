import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/shipping/policy.get'
import { makeRegion, makeShippingPolicyRow } from '~~/test/fixtures/shippingPolicy'
import { backend, cacheOptionsOf, callRoute, createTestEvent, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/shipping/policy'

/** Django's row: the storefront's row without the regions the route adds. */
function djangoEntry(overrides: Parameters<typeof makeShippingPolicyRow>[0] = {}) {
  const { regions: _regions, ...entry } = makeShippingPolicyRow(overrides)
  return entry
}

const REGIONS_PATH = (country: string) => `http://backend.test/api/v1/region/${country}/get_regions_by_country_alpha_2`

describe('GET /api/shipping/policy', () => {
  it('fetches the shipping policy of the store the request is on', async () => {
    const policy = [djangoEntry({ freeShippingThreshold: 40 })]
    backend.reply(policy)

    const response = await callRoute(handler, {
      route,
      url: '/api/shipping/policy',
      headers: { 'x-forwarded-host': 'evil.example' },
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual([{ ...policy[0], regions: [] }])
    // A store with no regional row makes no second read.
    expect(backend.requests.map(request => request.path)).toEqual(['http://backend.test/api/v1/shipping/policy'])
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('hands each regional row the records of the regions it names, one read per country, in the row\'s order', async () => {
    const attica = makeRegion()
    const crete = makeRegion({ alpha: 'GR-M', sortOrder: 2 })
    const famagusta = makeRegion({ alpha: 'CY-04', country: 'CY', sortOrder: 3 })
    const policy = [
      djangoEntry({ kind: 'pickup_point' }),
      djangoEntry({ price: 3.5, regionCodes: [crete.alpha, attica.alpha] }),
      djangoEntry({ price: 5, regionCodes: [attica.alpha] }),
      djangoEntry({ countryCode: 'CY', price: 9, regionCodes: [famagusta.alpha] }),
    ]
    backend.reply((request) => {
      if (request.path === REGIONS_PATH('GR')) return [attica, crete, makeRegion({ alpha: 'GR-A', sortOrder: 4 })]
      if (request.path === REGIONS_PATH('CY')) return [famagusta]
      return policy
    })

    const response = await callRoute(handler, { route, url: '/api/shipping/policy' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual([
      { ...policy[0], regions: [] },
      { ...policy[1], regions: [crete, attica] },
      { ...policy[2], regions: [attica] },
      { ...policy[3], regions: [famagusta] },
    ])
    expect(backend.requests.map(request => request.path).sort()).toEqual([
      'http://backend.test/api/v1/shipping/policy',
      REGIONS_PATH('CY'),
      REGIONS_PATH('GR'),
    ].sort())
    expect(backend.requests.every(request => request.headers.get('x-forwarded-host') === 'shop.test')).toBe(true)
  })

  it('answers 422 when the backend payload drifts from the contract', async () => {
    backend.reply([{ countryCode: 'GR' }])

    const response = await callRoute(handler, { route, url: '/api/shipping/policy' })

    expect(response.status).toBe(422)
  })

  // A policy whose regions cannot be named is not answered (and not cached)
  // as if its regional rows covered the whole country.
  it('fails when the regions of a regional row cannot be read', async () => {
    backend.reply((request) => {
      if (request.path === REGIONS_PATH('GR')) return jsonResponse({ detail: 'down' }, 503)
      return [djangoEntry({ regionCodes: ['GR-I'] })]
    })

    const response = await callRoute(handler, { route, url: '/api/shipping/policy' })

    expect(response.status).toBe(503)
  })

  // Django purges `shipping.policy` with the shipping surface.
  it('is cached per store under the name Django purges', async () => {
    const { name, getKey } = cacheOptionsOf(handler)

    expect(name).toBe('shipping.policy')
    expect((await getKey!(createTestEvent({}))).startsWith('shop.test__el__shipping-policy')).toBe(true)
  })
})
