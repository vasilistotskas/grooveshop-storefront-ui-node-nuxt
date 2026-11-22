import type { ProductShipping, ProductShippingEstimate } from '~~/shared/openapi/types.gen'

/**
 * A `ProductShippingEstimate`, what `GET /api/v1/shipping/product/<id>`
 * says one product costs to ship on its own, valid against the generated
 * `zProductShippingEstimate` (proved by
 * `test/unit/fixtures/productShipping.spec.ts`).
 *
 * Defaults: 1,99 € to GR, free above 39,90 €. An explicit override wins.
 */
export function makeProductShippingEstimate(overrides: Partial<ProductShippingEstimate> = {}): ProductShippingEstimate {
  return {
    countryCode: 'GR',
    price: 1.99,
    currency: 'EUR',
    free: false,
    freeShippingThreshold: 39.9,
    ...overrides,
  }
}

/** The route's whole answer: `estimate` priced, or `null` when nothing ships the product. */
export function makeProductShipping(estimate: ProductShippingEstimate | null = makeProductShippingEstimate()): ProductShipping {
  return { estimate }
}
