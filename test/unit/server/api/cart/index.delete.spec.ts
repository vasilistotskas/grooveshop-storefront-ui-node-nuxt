import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/cart/index.delete'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'

/**
 * DELETE /api/cart: empty the visitor's cart. Django deletes the cart
 * (204), and the cart session forgets its id — both the sealed session
 * and the `cart-id` fallback cookie — so the next request starts afresh.
 */
const route = '/api/cart'
const CART_UUID = '6f1c1d8e-2a4b-4c3d-9e8f-0a1b2c3d4e5f'

const emptyCart = (headers?: Record<string, string>) => callRoute(handler, { route, method: 'DELETE', headers })

describe('DELETE /api/cart', () => {
  it('asks nothing of Django for a visitor with neither a cart nor an account', async () => {
    const response = await emptyCart()

    expect(response.status).toBe(204)
    expect(backend.requests).toEqual([])
  })

  it('deletes a guest\'s cart by the UUID their session carries, then forgets it', async () => {
    backend.reply(new Response(null, { status: 204 }))

    const response = await emptyCart({ cookie: `cart-id=${CART_UUID}` })

    expect(response.status).toBe(204)
    expect(backend.lastRequest.method).toBe('DELETE')
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/cart')
    expect(backend.lastRequest.headers.get('x-cart-id')).toBe(CART_UUID)
    expect(response.headers.getSetCookie().some(cookie => /^cart-id=;/.test(cookie) && /Max-Age=0/i.test(cookie))).toBe(true)
  })

  it('deletes a signed-in shopper\'s cart with their access token', async () => {
    testSession.set({ secure: { accessToken: 'knox-1' } })
    backend.reply(new Response(null, { status: 204 }))

    await emptyCart()

    expect(backend.lastRequest.method).toBe('DELETE')
    expect(backend.lastRequest.headers.get('authorization')).toBe('Bearer knox-1')
  })

  it('passes on Django\'s refusal and keeps the cart it could not delete', async () => {
    backend.reply(jsonResponse({ detail: 'Not found.' }, 404))

    const response = await emptyCart({ cookie: `cart-id=${CART_UUID}` })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ detail: 'Not found.' })
    expect(response.headers.getSetCookie().some(cookie => cookie.startsWith('cart-id=;'))).toBe(false)
  })
})
