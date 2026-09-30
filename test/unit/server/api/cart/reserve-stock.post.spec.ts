import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/cart/reserve-stock.post'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'

/**
 * POST /api/cart/reserve-stock: holds the cart's stock while the shopper
 * pays. An out-of-stock 409 is RETURNED with its per-item detail (a
 * thrown error's data is stripped in production, which once disabled the
 * checkout's stock-error UI).
 */

const route = '/api/cart/reserve-stock'
const CART_UUID = '6f1c1d8e-2a4b-4c3d-9e8f-0a1b2c3d4e5f'

const reserve = () => callRoute(handler, { route, method: 'POST', headers: { cookie: `cart-id=${CART_UUID}` } })

describe('POST /api/cart/reserve-stock', () => {
  it('reserves the session cart\'s stock as the signed-in shopper', async () => {
    testSession.set({ secure: { accessToken: 'knox-1' } })
    backend.reply({ reservationIds: [4, 5], message: 'Reserved' })

    const response = await reserve()

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ reservationIds: [4, 5], message: 'Reserved' })
    const sent = backend.lastRequest
    expect(sent.method).toBe('POST')
    expect(sent.path).toBe('http://backend.test/api/v1/cart/reserve-stock')
    expect(sent.headers.get('x-cart-id')).toBe(CART_UUID)
    expect(sent.headers.get('authorization')).toBe('Bearer knox-1')
    expect(response.logger.fields).toMatchObject({ cart: { reservation: true } })
  })

  it.each([
    ['snake_case', { detail: 'Not enough stock', failed_items: [{ product_id: 1 }] }],
    ['camelCase', { detail: 'Not enough stock', failedItems: [{ product_id: 1 }] }],
  ])('returns an insufficient-stock 409 with the failed items (%s upstream)', async (_label, upstream) => {
    backend.reply(jsonResponse(upstream, 409))

    const response = await reserve()

    expect(response.status).toBe(409)
    expect(response.error).toBeUndefined()
    expect(response.body).toEqual({
      statusCode: 409,
      statusMessage: 'Insufficient stock',
      data: { code: 'insufficient_stock', detail: 'Not enough stock', failedItems: [{ product_id: 1 }] },
    })
  })

  it('forwards another 4xx body with its status', async () => {
    backend.reply(jsonResponse({ detail: 'Cart is empty.' }, 400))

    const response = await reserve()

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ detail: 'Cart is empty.' })
  })
})
