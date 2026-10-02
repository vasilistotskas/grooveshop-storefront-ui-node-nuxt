import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/loyalty/tiers.get'
import { backend, callRoute } from '~~/test/helpers/nitro'
import { makeTier } from '~~/test/fixtures/loyalty'

/**
 * GET /api/loyalty/tiers: the store's tier ladder, for anyone. Django
 * serves it to anonymous visitors (the programme is sold to people who
 * have not joined it), so the route asks for no session.
 */

const route = '/api/loyalty/tiers'

const TIER = makeTier()

describe('GET /api/loyalty/tiers', () => {
  it('answers a guest, reading the ladder as the caller\'s store', async () => {
    backend.reply([TIER])

    const response = await callRoute(handler, { route, url: route })

    expect(response.status).toBe(200)
    expect(response.body).toEqual([TIER])
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/loyalty/tiers')
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
    expect(backend.lastRequest.headers.get('authorization')).toBeNull()
  })
})
