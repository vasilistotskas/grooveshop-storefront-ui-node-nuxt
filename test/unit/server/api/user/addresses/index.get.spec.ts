import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/user/addresses/index.get'
import { makeUserAddress } from '~~/test/fixtures/user'
import { backend, callRoute, testSession } from '~~/test/helpers/nitro'

/**
 * GET /api/user/addresses: the signed-in shopper's saved addresses, read
 * by checkout and the account address book.
 *
 * A region is required only when the country has any, so an address may
 * carry `region: null`. The schema used to call it a string, and one
 * region-less address made this route answer 422 for the whole list —
 * checkout silently showed no saved addresses.
 */
const API = 'http://backend.test/api/v1'

const signIn = () => testSession.set({ user: { id: 1 }, secure: { accessToken: 'knox-1' } })

describe('GET /api/user/addresses', () => {
  it('lists the addresses, a region-less one included', async () => {
    signIn()
    const withRegion = makeUserAddress({ id: 1 })
    const withoutRegion = makeUserAddress({ id: 2, country: 'CY', region: null })
    backend.reply(() => ({ count: 2, results: [withRegion, withoutRegion] }))

    const response = await callRoute(handler, { url: '/api/user/addresses' })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ count: 2, results: [{ id: 1 }, { id: 2, region: null }] })
    expect(backend.requests[0]!.path).toBe(`${API}/user/address`)
    expect(backend.requests[0]!.headers.get('authorization')).toBe('Bearer knox-1')
  })
})
