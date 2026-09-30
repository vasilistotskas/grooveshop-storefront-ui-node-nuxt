import { describe, expect, it } from 'vitest'
import type { z } from 'zod'

import { zCartDetail, zCartItem } from '~~/shared/openapi/zod.gen'
import { makeCart, makeCartItem } from '~~/test/fixtures/cart'

/**
 * The cart fixtures replace hand-built carts that were cast
 * `as unknown as CartDetail` and lacked `currency`, the line `price` /
 * `finalPrice` and `uuid`. Parsed strictly (an unknown key is a renamed
 * field) so the next schema change fails here, naming the field, rather
 * than as a cart spec passing against a payload Django cannot send.
 */
function problems(schema: z.ZodObject, value: unknown): string[] {
  const result = schema.strict().safeParse(value)
  return result.success
    ? []
    : result.error.issues.map(i => `${i.path.join('.') || '(root)'}: ${i.message}`)
}

describe('makeCartItem', () => {
  it('builds a default line that parses through zCartItem', () => {
    expect(problems(zCartItem, makeCartItem())).toEqual([])
  })

  it('prices the line from its product and multiplies the totals by quantity', () => {
    const item = makeCartItem({ quantity: 3, product: { price: 10, vatPercent: 24 } })

    expect(problems(zCartItem, item)).toEqual([])
    expect(item).toMatchObject({
      price: 10,
      finalPrice: 12.4,
      vatValue: 2.4,
      totalPrice: 37.2,
      weightInfo: { unitWeight: 500, totalWeight: 1500, weightUnit: 'g' },
    })
  })
})

describe('makeCart', () => {
  it('builds a default cart that parses through zCartDetail', () => {
    expect(problems(zCartDetail, makeCart())).toEqual([])
  })

  it('parses as an empty cart', () => {
    const cart = makeCart({ items: [] })

    expect(problems(zCartDetail, cart)).toEqual([])
    expect(cart).toMatchObject({ totalItems: 0, totalItemsUnique: 0, totalPrice: 0 })
  })

  it('sums its totals over the items and ties each item to the cart', () => {
    const cart = makeCart({
      id: 7,
      items: [
        { id: 1, quantity: 2, product: { id: 1, price: 10, vatPercent: 24 } },
        { id: 2, quantity: 1, product: { id: 2, price: 5, vatPercent: 0 } },
      ],
    })

    expect(problems(zCartDetail, cart)).toEqual([])
    expect(cart).toMatchObject({
      totalItems: 3,
      totalItemsUnique: 2,
      totalPrice: 29.8,
      totalVatValue: 4.8,
      totalWeightGrams: 1500,
    })
    expect(cart.items.map(item => item.cartId)).toEqual([cart.uuid, cart.uuid])
    expect(cart.items[0]!.uuid).not.toBe(cart.items[1]!.uuid)
  })
})
