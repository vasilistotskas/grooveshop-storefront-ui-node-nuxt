import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/countries/index.get'
import { makeCountry } from '~~/test/fixtures/country'
import { backend, cacheOptionsOf, callRoute, createTestEvent } from '~~/test/helpers/nitro'

/**
 * GET /api/countries. `pagination=false` is how the whole ~250-row list
 * arrives in one request (DRF caps a page at 100); Django then answers a
 * bare array, which the route re-wraps so readers keep reading `results`.
 */

const route = '/api/countries'

const greece = makeCountry({ phoneMetadata: null })

describe('GET /api/countries', () => {
  it('re-wraps the unpaginated list as a page', async () => {
    backend.reply([greece])

    const response = await callRoute(handler, { route, url: `${route}?pagination=false&shippable=true` })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ count: 1, results: [greece] })
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/country')
    expect(backend.lastRequest.query).toMatchObject({ pagination: 'false', shippable: 'true' })
  })

  it('passes a paginated page through', async () => {
    backend.reply({ count: 1, results: [greece] })

    const response = await callRoute(handler, { route, url: `${route}?pageSize=50` })

    expect(response.body).toEqual({ count: 1, results: [greece] })
  })

  it('answers 422 when the unpaginated list drifts from the contract', async () => {
    backend.reply({ count: 1, results: [greece] })

    const response = await callRoute(handler, { route, url: `${route}?pagination=false` })

    expect(response.status).toBe(422)
  })

  it.each(['pageSize=100', 'languageCode=en', 'shippable=true', 'hasPhoneCode=true', 'pagination=false'])(
    'gives a list differing only in %s its own cache entry',
    async (param) => {
      const { getKey } = cacheOptionsOf(handler)

      expect(await getKey!(createTestEvent({ url: `${route}?${param}` })))
        .not.toBe(await getKey!(createTestEvent({ url: route })))
    },
  )
})
