import { describe, it, expect } from 'vitest'
import {
  cartContentIds,
  cartGa4Items,
  cartOpenAIContents,
  cartTikTokContents,
} from '~/utils/checkoutAnalytics'
import { makeCart } from '~~/test/fixtures/cart'

/**
 * Two lines: product 1 at a discounted final price (so `finalPrice`
 * and the net `price` differ), and product 2 twice at full price.
 */
const cart = makeCart({
  items: [
    { id: 1, quantity: 1, product: { id: 1, price: 100, discountPercent: 10 } },
    { id: 2, quantity: 2, product: { id: 2, price: 50 } },
  ],
})

describe('checkout analytics item mappers', () => {
  it('lists the product ids for Meta, skipping a line without one', () => {
    const withBrokenLine = makeCart({ items: [{ id: 1 }, { id: 2 }] })
    ;(withBrokenLine.items[1]!.product as { id?: number }).id = undefined

    expect(cartContentIds(cart)).toEqual(['1', '2'])
    expect(cartContentIds(withBrokenLine)).toEqual(['1'])
  })

  it('prices TikTok contents at the final (VAT-in, discounted) unit price', () => {
    expect(cartTikTokContents(cart)).toEqual([
      { contentId: '1', quantity: 1, price: 114 },
      { contentId: '2', quantity: 2, price: 62 },
    ])
  })

  it('prices GA4 items at the final unit price, under GA4\'s snake_case keys', () => {
    expect(cartGa4Items(cart)).toEqual([
      { item_id: '1', quantity: 1, price: 114 },
      { item_id: '2', quantity: 2, price: 62 },
    ])
  })

  it('sends OpenAI contents without a price', () => {
    expect(cartOpenAIContents(cart)).toEqual([
      { id: '1', contentType: 'product', quantity: 1 },
      { id: '2', contentType: 'product', quantity: 2 },
    ])
  })

  it('falls back to the net price when the product carries no final price', () => {
    const netOnly = makeCart({ items: [{ product: { id: 7, price: 40 } }] })
    ;(netOnly.items[0]!.product as { finalPrice?: number }).finalPrice = undefined

    expect(cartGa4Items(netOnly)).toEqual([{ item_id: '7', quantity: 1, price: 40 }])
    expect(cartTikTokContents(netOnly)).toEqual([{ contentId: '7', quantity: 1, price: 40 }])
  })

  it.each([
    ['no cart', null],
    ['an empty cart', makeCart({ items: [] })],
  ])('maps %s to no items', (_case, empty) => {
    expect(cartContentIds(empty)).toEqual([])
    expect(cartTikTokContents(empty)).toEqual([])
    expect(cartGa4Items(empty)).toEqual([])
    expect(cartOpenAIContents(empty)).toEqual([])
  })
})
