import { describe, expect, it } from 'vitest'

import { zProduct } from '~~/shared/openapi/zod.gen'
import { makeProduct } from '~~/test/fixtures/product'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/**
 * `makeProduct` is the product every storefront spec builds on, and the
 * cart fixtures nest it. If it drifts from the generated schema, specs
 * keep passing against a payload Django can no longer send — so it is
 * parsed here, strictly (an unknown key is a renamed field), and the
 * failure names the field.
 */
describe('makeProduct', () => {
  it('builds a default product that parses through zProduct', () => {
    expect(problems(zProduct, makeProduct())).toEqual([])
  })

  it('derives the money fields from price, discount and VAT the way Django does', () => {
    const product = makeProduct({ price: 100, discountPercent: 10, vatPercent: 24 })

    expect(problems(zProduct, product)).toEqual([])
    expect(product).toMatchObject({
      price: 100,
      discountValue: 10,
      priceSavePercent: 10,
      vatValue: 24,
      finalPrice: 114,
    })
  })

  it('keys uuid and slug off the id so two products never collide', () => {
    const first = makeProduct({ id: 1 })
    const second = makeProduct({ id: 2 })

    expect(problems(zProduct, second)).toEqual([])
    expect(second.uuid).not.toBe(first.uuid)
    expect(second.slug).not.toBe(first.slug)
  })

  it('lets an explicit override of a derived field win', () => {
    expect(makeProduct({ price: 100, finalPrice: 1 }).finalPrice).toBe(1)
  })
})
