import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/cart/index.get'
import { makeCart } from '~~/test/fixtures/cart'
import { backend, callRoute, jsonResponse, log, testSession } from '~~/test/helpers/nitro'

/**
 * GET /api/cart: the visitor's cart. A guest is known by the cart UUID in
 * their cart session (or its `cart-id` fallback cookie), a shopper by
 * their access token; with neither there is no cart to ask for. An
 * expired token answers "no cart" rather than an error page, because the
 * allauth routes clear that session in the same render.
 */

const route = '/api/cart'
const CART_UUID = '6f1c1d8e-2a4b-4c3d-9e8f-0a1b2c3d4e5f'
const MERGED_UUID = '0e2b9c1a-7d3f-4b6e-8a5c-1f2e3d4c5b6a'

const getCart = (headers?: Record<string, string>) => callRoute(handler, { route, headers })

describe('GET /api/cart', () => {
  it('asks nothing of Django for a visitor with neither a cart nor an account', async () => {
    const response = await getCart()

    expect(response.body).toBeUndefined()
    expect(backend.requests).toEqual([])
  })

  it('fetches a guest\'s cart by the UUID their session carries', async () => {
    const cart = makeCart({ uuid: CART_UUID })
    backend.reply(cart)

    const response = await getCart({ 'cookie': `cart-id=${CART_UUID}`, 'x-forwarded-host': 'evil.example' })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ uuid: CART_UUID, totalItems: 1 })
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/cart')
    expect(backend.lastRequest.headers.get('x-cart-id')).toBe(CART_UUID)
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
    expect(response.logger.fields).toMatchObject({ cart: { id: CART_UUID } })
  })

  it('fetches a signed-in shopper\'s cart with their access token', async () => {
    testSession.set({ secure: { accessToken: 'knox-1' } })
    backend.reply(makeCart())

    await getCart()

    expect(backend.lastRequest.headers.get('authorization')).toBe('Bearer knox-1')
    expect(backend.lastRequest.headers.has('x-cart-id')).toBe(false)
  })

  it('adopts the cart Django answers with, so a merged cart replaces the guest one', async () => {
    backend.reply(makeCart({ uuid: MERGED_UUID }))

    const response = await getCart({ cookie: `cart-id=${CART_UUID}` })

    expect(response.headers.getSetCookie().some(cookie => cookie.startsWith(`cart-id=${MERGED_UUID};`))).toBe(true)
  })

  it.each([401, 403])('answers "no cart" when Django rejects the token with %i', async (status) => {
    testSession.set({ secure: { accessToken: 'expired' } })
    backend.reply(jsonResponse({ detail: 'Invalid token.' }, status))

    const response = await getCart()

    expect(response.error).toBeUndefined()
    expect(response.body).toBeUndefined()
    expect(log.info).toHaveBeenCalled()
  })

  it('answers 422 when the cart payload drifts from the contract', async () => {
    backend.reply({ ...makeCart({ uuid: CART_UUID }), items: 'none' })

    const response = await getCart({ cookie: `cart-id=${CART_UUID}` })

    expect(response.status).toBe(422)
  })
})
