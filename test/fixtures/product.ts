import type { Product, ProductReview } from '~~/shared/openapi/types.gen'

/** The timestamp every fixture carries; fixed so snapshots never drift. */
export const FIXTURE_TIMESTAMP = '2026-01-01T00:00:00Z'

/**
 * A valid RFC 9562 v4 UUID derived from a fixture's `scope` and `id`, so
 * two fixtures with different ids never share a uuid and the same id
 * always yields the same one.
 */
export function fixtureUuid(scope: number, id: number): string {
  const tail = id.toString(16).padStart(12, '0')
  return `00000000-0000-4${scope.toString(16).padStart(3, '0')}-8000-${tail}`
}

/** Money is rounded to cents, as Django's `_quantize_cents` does. */
export const cents = (value: number) => Math.round(value * 100) / 100

/**
 * A `Product` as Django serialises it, valid against the generated
 * `zProduct` (proved by `test/unit/fixtures/product.spec.ts`).
 *
 * Defaults: id 1, net `price` 50 at 24% VAT with no discount, 10 in
 * stock, 500 g, parler `translations` for `el` and `en`. `uuid` and
 * `slug` follow `id`.
 *
 * The derived money fields — `discountValue`, `priceSavePercent`,
 * `vatValue`, `finalPrice` — are computed from `price`,
 * `discountPercent` and `vatPercent` the way Django's `Product`
 * properties compute them (`product/models/product.py`: discount and
 * VAT are both taken off the NET price, `finalPrice = price + vat -
 * discount`), so `makeProduct({ price: 100, discountPercent: 10 })` is
 * self-consistent. An explicit override of a derived field wins.
 */
export function makeProduct(overrides: Partial<Product> = {}): Product {
  const id = overrides.id ?? 1
  const price = overrides.price ?? 50
  const discountPercent = overrides.discountPercent ?? 0
  const vatPercent = overrides.vatPercent ?? 24
  const discountValue = cents((price * discountPercent) / 100)
  const vatValue = cents((price * vatPercent) / 100)

  return {
    id,
    translations: {
      el: {
        name: `Προϊόν ${id}`,
        description: '',
        seoTitle: '',
        seoDescription: '',
        seoKeywords: '',
      },
      en: {
        name: `Product ${id}`,
        description: '',
        seoTitle: '',
        seoDescription: '',
        seoKeywords: '',
      },
    },
    slug: `product-${id}`,
    category: 1,
    variantGroup: null,
    brand: null,
    brandName: null,
    price,
    vat: vatPercent > 0 ? 1 : null,
    viewCount: 0,
    stock: 10,
    lowStockThreshold: 0,
    active: true,
    weight: { unit: 'g', value: 500 },
    discountPercent,
    discountValue,
    priceSavePercent: price > 0 ? (discountValue / price) * 100 : 0,
    vatPercent,
    vatValue,
    finalPrice: cents(price + vatValue - discountValue),
    mainImagePath: '',
    reviewAverage: 0,
    reviewCount: 0,
    likesCount: 0,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    uuid: fixtureUuid(1, id),
    attributes: [],
    ...overrides,
  }
}

/**
 * A published `ProductReview` as the product's review list serialises it,
 * valid against the generated `zProductReview` (proved by
 * `test/unit/fixtures/product.spec.ts`).
 *
 * Defaults: id 1, a rate of 8 (four stars), by Μαρία Παπαδοπούλου, on
 * product 1, with a Greek comment. `uuid` follows `id`.
 */
export function makeProductReview(overrides: Partial<ProductReview> = {}): ProductReview {
  const id = overrides.id ?? 1
  return {
    id,
    product: { id: 1, name: 'Προϊόν 1', slug: 'product-1', mainImagePath: '' },
    user: { id: 7, username: null, firstName: 'Μαρία', lastName: 'Παπαδοπούλου', mainImagePath: '' },
    rate: 8,
    status: 'TRUE',
    isPublished: true,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    publishedAt: FIXTURE_TIMESTAMP,
    uuid: fixtureUuid(24, id),
    translations: { el: { comment: `Κριτική ${id}` } },
    ...overrides,
  }
}
