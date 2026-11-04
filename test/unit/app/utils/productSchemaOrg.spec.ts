import { describe, expect, it } from 'vitest'
import { productSchemaOrg } from '~/utils/productSchemaOrg'
import { makeProduct, makeProductReview } from '~~/test/fixtures/product'

const base = {
  name: 'Powerbank',
  description: 'Φορητή μπαταρία',
  url: 'https://store.test/products/7/powerbank',
  imageUrls: ['https://assets.store.test/a.jpeg'],
  storeName: 'Store',
  currency: 'EUR',
  reviews: null,
  anonymousReviewer: 'Ανώνυμος',
  reviewComment: () => 'Πολύ καλό',
}

describe('productSchemaOrg', () => {
  // Merchant Center matches a page's offer to the feed's by this
  // identifier; the feed's g:id is the product id.
  it('identifies the product by its id, the feeds\' g:id', () => {
    const node = productSchemaOrg({ ...base, product: makeProduct({ id: 7 }) })

    expect(node.sku).toBe('7')
    expect(node.productID).toBe('7')
  })

  it('offers the current price and states no invented validity date', () => {
    const node = productSchemaOrg({ ...base, product: makeProduct({ id: 7, finalPrice: 39.58, effectivePrice: 39.58 }) })

    expect(node.offers.price).toBe('39.58')
    expect(node.offers.priceCurrency).toBe('EUR')
    expect(node.offers).not.toHaveProperty('priceValidUntil')
  })

  it('strikes through only an announced prior price', () => {
    const announced = productSchemaOrg({ ...base, product: makeProduct({ priorPrice: 49.48, announcedDiscountPercent: 20 }) })
    const plain = productSchemaOrg({ ...base, product: makeProduct({ priorPrice: null, announcedDiscountPercent: null }) })

    expect(announced.offers.priceSpecification?.[0]?.price).toBe('49.48')
    expect(plain.offers.priceSpecification).toBeUndefined()
  })

  it('dates an announced sale price from when the reduction started', () => {
    const startedAt = '2026-09-21T18:20:28+03:00'
    const announced = productSchemaOrg({ ...base, product: makeProduct({ priorPrice: 49.48, announcedDiscountPercent: 20, reductionStartedAt: startedAt }) })
    const unannounced = productSchemaOrg({ ...base, product: makeProduct({ priorPrice: null, announcedDiscountPercent: null, reductionStartedAt: startedAt }) })

    expect(announced.offers.validFrom).toBe(startedAt)
    expect(unannounced.offers.validFrom).toBeUndefined()
  })

  it('reads availability from the stock', () => {
    expect(productSchemaOrg({ ...base, product: makeProduct({ stock: 0 }) }).offers.availability)
      .toBe('https://schema.org/OutOfStock')
    expect(productSchemaOrg({ ...base, product: makeProduct({ stock: 3 }) }).offers.availability)
      .toBe('https://schema.org/LimitedAvailability')
    expect(productSchemaOrg({ ...base, product: makeProduct({ stock: 40 }) }).offers.availability)
      .toBe('https://schema.org/InStock')
  })

  it('carries no rating or review with the store\'s reviews off', () => {
    const node = productSchemaOrg({ ...base, reviews: null, product: makeProduct({ reviewCount: 4, reviewAverage: 8 }) })

    expect(node.aggregateRating).toBeUndefined()
    expect(node.review).toBeUndefined()
  })

  it('rates and lists at most five reviews, an unnamed reviewer as the page calls them', () => {
    const reviews = Array.from({ length: 7 }, (_, i) => makeProductReview({ id: i + 1, rate: 8 }))
    reviews[0] = makeProductReview({ id: 1, rate: 8, user: undefined })
    const node = productSchemaOrg({ ...base, reviews, product: makeProduct({ reviewCount: 7, reviewAverage: 8 }) })

    expect(node.aggregateRating?.reviewCount).toBe(7)
    expect(node.review).toHaveLength(5)
    expect(node.review?.[0]?.author.name).toBe('Ανώνυμος')
    expect(node.review?.[0]?.reviewBody).toBe('Πολύ καλό')
  })

  it('omits an empty category and image list', () => {
    const node = productSchemaOrg({ ...base, imageUrls: [], category: '', product: makeProduct() })

    expect(node.image).toBeUndefined()
    expect(node.category).toBeUndefined()
  })

  it('states the weight in the unit code of its unit, and no weight for none', () => {
    const weighed = productSchemaOrg({ ...base, product: makeProduct({ weight: { unit: 'g', value: 105 } }) })
    const zero = productSchemaOrg({ ...base, product: makeProduct({ weight: { unit: 'kg', value: 0 } }) })
    const unset = productSchemaOrg({ ...base, product: makeProduct({ weight: null }) })

    expect(weighed.weight).toEqual({ '@type': 'QuantitativeValue', 'value': 105, 'unitCode': 'GRM' })
    expect(zero.weight).toBeUndefined()
    expect(unset.weight).toBeUndefined()
  })

  it('lists the specifications the page shows', () => {
    const attributes = [{ id: 1, attributeId: 1, attributeName: 'Χωρητικότητα', isVariant: false, schemaProperty: '' as const, attributeValueId: 1, value: '5000 mAh', createdAt: '2026-01-01T00:00:00Z' }]

    expect(productSchemaOrg({ ...base, product: makeProduct({ attributes }) }).additionalProperty)
      .toEqual([{ '@type': 'PropertyValue', 'name': 'Χωρητικότητα', 'value': '5000 mAh' }])
    expect(productSchemaOrg({ ...base, product: makeProduct({ attributes: [] }) }).additionalProperty).toBeUndefined()
  })

  it('states a standard property as the Product\'s own, not as a specification', () => {
    const attribute = { id: 1, attributeId: 1, isVariant: true, attributeValueId: 1, createdAt: '2026-01-01T00:00:00Z' }
    const node = productSchemaOrg({ ...base, product: makeProduct({ attributes: [
      { ...attribute, attributeName: 'Χρώμα', schemaProperty: 'color', value: 'Μαύρο' },
      { ...attribute, attributeName: 'Ηλικία', schemaProperty: 'suggestedAge', value: '3+' },
    ] }) })

    expect(node).toMatchObject({ color: 'Μαύρο' })
    expect(node.additionalProperty).toEqual([{ '@type': 'PropertyValue', 'name': 'Ηλικία', 'value': '3+' }])
  })

  it('links a variant to its group and the other variants\' pages', () => {
    const node = productSchemaOrg({
      ...base,
      product: makeProduct({ brandName: 'Anker' }),
      variantGroup: { id: 4, name: 'Mini Power Bank', variesBy: ['color'], variantPaths: ['/products/3/white'] },
    })

    expect(node.isVariantOf).toEqual({
      '@type': 'ProductGroup',
      'name': 'Mini Power Bank',
      'productGroupID': '4',
      'brand': { '@type': 'Brand', 'name': 'Anker' },
      'variesBy': ['color'],
      'hasVariant': [{ url: '/products/3/white' }],
    })
  })

  it('states the identifiers the store entered, and none it did not', () => {
    const entered = productSchemaOrg({ ...base, product: makeProduct({ gtin: '5901234123457', mpn: 'WS-20' }) })
    const none = productSchemaOrg({ ...base, product: makeProduct({ gtin: '', mpn: '' }) })

    expect(entered).toMatchObject({ gtin: '5901234123457', mpn: 'WS-20' })
    expect(none.gtin).toBeUndefined()
    expect(none.mpn).toBeUndefined()
  })

  it('names no group for a product without one', () => {
    expect(productSchemaOrg({ ...base, product: makeProduct() }).isVariantOf).toBeUndefined()
  })

  it('names the product\'s own brand, else the store', () => {
    expect(productSchemaOrg({ ...base, product: makeProduct({ brandName: 'Anker' }) }).brand.name).toBe('Anker')
    expect(productSchemaOrg({ ...base, product: makeProduct({ brandName: null }) }).brand.name).toBe('Store')
  })
})
