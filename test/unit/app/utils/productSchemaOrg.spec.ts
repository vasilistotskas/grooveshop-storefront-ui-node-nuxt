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
    reviews[0] = makeProductReview({ id: 1, rate: 8, user: null })
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
})
