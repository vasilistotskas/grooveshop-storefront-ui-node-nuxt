import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/loyalty/settings.get'
import { backend, cacheOptionsOf, callRoute, createTestEvent } from '~~/test/helpers/nitro'

/**
 * GET /api/loyalty/settings?keys=a,b: the loyalty settings the storefront
 * asks for, read in ONE call to the store's public settings (not one per
 * key) and answered as a key → value record in which an unset key is ''.
 */

const route = '/api/loyalty/settings'

describe('GET /api/loyalty/settings', () => {
  it('reads the public settings once, as the caller\'s store, and picks the requested keys', async () => {
    backend.reply({ settings: { LOYALTY_ENABLED: 'true', LOYALTY_POINTS_FACTOR: '1.5', UNRELATED: 'x' } })

    const response = await callRoute(handler, {
      route,
      url: `${route}?keys=LOYALTY_ENABLED,%20LOYALTY_POINTS_FACTOR,,LOYALTY_TIER_BONUS`,
      headers: { 'x-forwarded-host': 'evil.example' },
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ LOYALTY_ENABLED: 'true', LOYALTY_POINTS_FACTOR: '1.5', LOYALTY_TIER_BONUS: '' })
    expect(backend.requests).toHaveLength(1)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/settings/public')
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('answers 400 without keys', async () => {
    const response = await callRoute(handler, { route, url: `${route}?keys=` })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('gives each requested key set its own cache entry', async () => {
    const { getKey } = cacheOptionsOf(handler)

    expect(await getKey!(createTestEvent({ url: `${route}?keys=A` })))
      .not.toBe(await getKey!(createTestEvent({ url: `${route}?keys=A,B` })))
  })
})
