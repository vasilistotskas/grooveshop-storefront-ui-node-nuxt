/**
 * PUT /api/cart/items/[id]: a quantity change. It forwards the change and
 * answers with the cart Django returns beside the line, so the client sets
 * it and does not load the cart a second time.
 */
import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/cart/items/[id]/index.put'
import { makeCart, makeCartItem } from '~~/test/fixtures/cart'
import { backend, callRoute } from '~~/test/helpers/nitro'

const route = '/api/cart/items/:id'
const CART_UUID = '6f1c1d8e-2a4b-4c3d-9e8f-0a1b2c3d4e5f'

/** What Django answers a change with: the line, as `CartItemDetail`, and the cart it sits in. */
const changedLine = () => ({
  ...makeCartItem({ id: 7, quantity: 5 }),
  cartId: CART_UUID,
  recommendations: [],
  cart: makeCart({ uuid: CART_UUID, items: [{ id: 7, quantity: 5 }] }),
})

const change = (body: unknown) => callRoute(handler, { route, url: '/api/cart/items/7', method: 'PUT', body })

describe('PUT /api/cart/items/[id]', () => {
  it('forwards the quantity and answers with the cart Django returned, not the line', async () => {
    const changed = changedLine()
    backend.reply(changed)

    const response = await change({ quantity: 5 })

    expect(response.status).toBe(200)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/cart/item/7')
    expect(backend.lastRequest.method).toBe('PUT')
    expect(backend.lastRequest.body).toEqual({ quantity: 5 })
    expect(response.body).toEqual(JSON.parse(JSON.stringify(changed.cart)))
    expect(backend.requests).toHaveLength(1)
  })

  it('answers 422 when the answer carries no cart: the contract requires it', async () => {
    const { cart: _cart, ...line } = changedLine()
    backend.reply(line)

    const response = await change({ quantity: 5 })

    expect(response.status).toBe(422)
  })
})
