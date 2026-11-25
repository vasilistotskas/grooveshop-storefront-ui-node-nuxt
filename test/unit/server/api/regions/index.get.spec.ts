import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/regions/index.get'
import { backend, cacheOptionsOf, callRoute, createTestEvent } from '~~/test/helpers/nitro'

/**
 * GET /api/regions. `shippable=true` keeps the regions the store's home
 * deliveries reach (its shipping zones), so the address forms offer only
 * those; the answer differs per store and per filter, and the cache keys
 * on both.
 */

const route = '/api/regions'

const page = { count: 0, links: { next: null, previous: null }, totalPages: 1, pageSize: 12, pageTotalResults: 0, page: 1, results: [] }

describe('GET /api/regions', () => {
  it('asks Django for the regions the store delivers to', async () => {
    backend.reply(page)

    const response = await callRoute(handler, { route, url: `${route}?country=GR&shippable=true` })

    expect(response.status).toBe(200)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/region')
    expect(backend.lastRequest.query).toMatchObject({ country: 'GR', shippable: 'true' })
  })

  it('gives the regions the store delivers to their own cache entry', async () => {
    const { getKey } = cacheOptionsOf(handler)

    expect(await getKey!(createTestEvent({ url: `${route}?country=GR&shippable=true` })))
      .not.toBe(await getKey!(createTestEvent({ url: `${route}?country=GR` })))
  })
})
