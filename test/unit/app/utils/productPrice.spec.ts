import { describe, expect, it } from 'vitest'
import { productWasPrice } from '~/utils/productPrice'
import { makeProduct } from '~~/test/fixtures/product'

/**
 * The struck-through "was" price. Django: `final_price = price + vat -
 * discount`, VAT and discount both on the net `price`
 * (`product/models/product.py`); `makeProduct` derives them the same way.
 */
describe('productWasPrice', () => {
  it('strikes the VAT-inclusive pre-discount price, not the net price', () => {
    // net 50, 24% VAT, 10% off: final 50 + 12 - 5 = 57, was 62.
    const product = makeProduct({ price: 50, vatPercent: 24, discountPercent: 10 })

    expect(product.finalPrice).toBe(57)
    expect(productWasPrice(product, product.finalPrice)).toBe(62)
  })

  it('shows a discount smaller than the VAT, which a net-price comparison hid', () => {
    // net 50 < final 57, so `price > finalPrice` read as "no discount".
    const product = makeProduct({ price: 50, vatPercent: 24, discountPercent: 10 })

    expect(productWasPrice(product, product.finalPrice)).toBeDefined()
    expect(product.price).toBeLessThan(product.finalPrice)
  })

  it('strikes nothing on an undiscounted product, even though its net price differs', () => {
    const product = makeProduct({ price: 50, vatPercent: 24, discountPercent: 0 })

    expect(productWasPrice(product, product.finalPrice)).toBeUndefined()
  })

  it('strikes the retail price under a lower wholesale price', () => {
    const product = makeProduct({ price: 50, vatPercent: 24, discountPercent: 10 })

    expect(productWasPrice(product, 40)).toBe(product.finalPrice)
  })

  it('ignores a wholesale price that is not lower than retail', () => {
    const product = makeProduct({ price: 50, vatPercent: 24, discountPercent: 0 })

    expect(productWasPrice(product, product.finalPrice)).toBeUndefined()
  })
})
