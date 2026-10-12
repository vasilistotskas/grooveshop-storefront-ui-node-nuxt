import { describe, expect, it } from 'vitest'
import {
  productAnnouncement,
  productCurrentPrice,
  productWasPrice,
  shopperFinalPrice,
} from '~~/shared/utils/productPrice'
import { makeProduct } from '~~/test/fixtures/product'

/**
 * A reduction may be announced only with the Omnibus prior price Django
 * froze (`priorPrice`); the markdown (`discountPercent`) is never one.
 */
const announced = makeProduct({
  price: 50,
  vatPercent: 24,
  discountPercent: 10,
  effectivePrice: 50,
  priorPrice: 62,
  announcedDiscountPercent: 19,
})

describe('productCurrentPrice', () => {
  it('is the effective price, which counts the unconditional promotions finalPrice ignores', () => {
    const product = makeProduct({ price: 50, vatPercent: 24, effectivePrice: 55 })

    expect(product.finalPrice).toBe(62)
    expect(productCurrentPrice(product)).toBe(55)
  })

  it('falls back to the final price until an effective price is recorded', () => {
    const product = makeProduct({ price: 50, vatPercent: 24, effectivePrice: null })

    expect(productCurrentPrice(product)).toBe(62)
  })

  it('keeps a search hit without a final price missing', () => {
    expect(productCurrentPrice({ finalPrice: null, effectivePrice: null })).toBeNull()
  })
})

describe('productAnnouncement', () => {
  it('announces the prior price and the percentage Django computed from it', () => {
    expect(productAnnouncement(announced)).toEqual({ priorPrice: 62, percent: 19 })
  })

  it('announces nothing for a markdown without a prior price', () => {
    const product = makeProduct({ price: 50, discountPercent: 10 })

    expect(product.discountPercent).toBe(10)
    expect(productAnnouncement(product)).toBeUndefined()
  })

  it('announces nothing when the percentage is absent, even with a prior price', () => {
    expect(productAnnouncement({ priorPrice: 62, announcedDiscountPercent: null })).toBeUndefined()
  })
})

describe('productWasPrice', () => {
  it('strikes the prior price of an announced reduction', () => {
    expect(productWasPrice(announced, productCurrentPrice(announced))).toBe(62)
  })

  it('strikes nothing on a markdown that has no prior price', () => {
    const product = makeProduct({ price: 50, vatPercent: 24, discountPercent: 10 })

    expect(productWasPrice(product, productCurrentPrice(product))).toBeUndefined()
  })

  it('strikes nothing on a plain product', () => {
    const product = makeProduct({ price: 50, vatPercent: 24 })

    expect(productWasPrice(product, productCurrentPrice(product))).toBeUndefined()
  })

  it('strikes the retail price under a lower wholesale price', () => {
    const product = makeProduct({ price: 50, vatPercent: 24, effectivePrice: 55 })

    expect(productWasPrice(product, 40)).toBe(55)
  })

  it('strikes the retail price, not the prior price, under a wholesale price', () => {
    expect(productWasPrice(announced, 40)).toBe(50)
  })
})

describe('shopperFinalPrice', () => {
  it('is the retail price without a wholesale price', () => {
    expect(shopperFinalPrice(124, undefined)).toBe(124)
  })

  it('is the wholesale price when it is below retail, as a number whatever its wire type', () => {
    expect(shopperFinalPrice(124, { finalPrice: '90.00' as unknown as number })).toBe(90)
  })

  it('keeps retail when the wholesale price is not lower', () => {
    expect(shopperFinalPrice(62, { finalPrice: 70 })).toBe(62)
    expect(shopperFinalPrice(62, { finalPrice: 62 })).toBe(62)
  })

  it('keeps a missing retail price missing', () => {
    expect(shopperFinalPrice(null, undefined)).toBeNull()
  })
})
