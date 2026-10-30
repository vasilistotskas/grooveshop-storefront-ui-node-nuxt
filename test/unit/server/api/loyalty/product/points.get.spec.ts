import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/loyalty/product/points.get'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'
import { makeProductPoints } from '~~/test/fixtures/loyalty'

/**
 * GET /api/loyalty/product/points?productIds=7,9: a cart's points in one
 * request, as the signed-in shopper (their tier multiplies them), so it
 * needs a session and asks Django with its token.
 */

const route = '/api/loyalty/product/points'
const signedIn = { user: { id: 5 }, secure: { accessToken: 'knox-1' } }

const request = (search = '?productIds=7,9') => callRoute(handler, { route, url: `${route}${search}` })

describe('GET /api/loyalty/product/points', () => {
  it('asks Django for every product at once, as the shopper', async () => {
    testSession.set(signedIn)
    const points = [makeProductPoints({ productId: 7 }), makeProductPoints({ productId: 9, potentialPoints: 3 })]
    backend.reply(points)

    const response = await request()

    expect(response.status).toBe(200)
    expect(response.body).toEqual(points)
    expect(backend.requests).toHaveLength(1)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/loyalty/product/points')
    expect(backend.lastRequest.query).toEqual({ productIds: '7,9' })
    expect(backend.lastRequest.headers.get('authorization')).toBe('Bearer knox-1')
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('returns Django\'s refusal of a bad id list', async () => {
    testSession.set(signedIn)
    const refusal = { detail: 'Give from 1 to 100 product IDs, each a positive integer.', code: 'invalid_product_ids' }
    backend.reply(jsonResponse(refusal, 400))

    const response = await request('?productIds=0')

    expect(response.status).toBe(400)
    expect(response.body).toEqual(refusal)
  })

  it('refuses a request without ids, without asking Django', async () => {
    testSession.set(signedIn)

    const response = await request('')

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('answers 401 to a visitor who is not signed in', async () => {
    const response = await request()

    expect(response.status).toBe(401)
    expect(backend.requests).toEqual([])
  })
})
