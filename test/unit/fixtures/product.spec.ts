import { describe, expect, it } from 'vitest'

import { zProduct, zProductCard, zProductReview } from '~~/shared/openapi/zod.gen'
import { makeProduct, makeProductCard, makeProductReview } from '~~/test/fixtures/product'
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

describe('makeProductCard', () => {
  it('builds a default card that parses through zProductCard', () => {
    expect(problems(zProductCard, makeProductCard())).toEqual([])
  })

  it('carries a product without a category, as the list serves it', () => {
    expect(problems(zProductCard, makeProductCard({ category: null }))).toEqual([])
  })

  it('carries none of what the list dropped', () => {
    const card = makeProductCard()

    for (const dropped of ['price', 'attributes', 'imagePaths', 'variantGroup', 'vatPercent', 'viewCount']) {
      expect(card).not.toHaveProperty(dropped)
    }
  })

  it('keys uuid off the id so two cards never collide', () => {
    expect(makeProductCard({ id: 2 }).uuid).not.toBe(makeProductCard().uuid)
  })
})

describe('makeProductReview', () => {
  it('builds a default review that parses through zProductReview', () => {
    expect(problems(zProductReview, makeProductReview())).toEqual([])
  })

  it('keys uuid off the id so two reviews never collide', () => {
    expect(makeProductReview({ id: 2 }).uuid).not.toBe(makeProductReview().uuid)
  })
})
