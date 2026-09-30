import type { CartDetail, CartItem, Product } from '~~/shared/openapi/types.gen'
import { cents, FIXTURE_TIMESTAMP, fixtureUuid, makeProduct } from './product'

/** A cart line's overrides; `product` is itself a `makeProduct` override. */
export type CartItemOverrides = Partial<Omit<CartItem, 'product'>> & {
  product?: Partial<Product>
}

/** A cart's overrides; each of `items` is a `makeCartItem` override. */
export type CartOverrides = Partial<Omit<CartDetail, 'items'>> & {
  items?: CartItemOverrides[]
}

/**
 * A `CartItem` as Django serialises it, valid against the generated
 * `zCartItem` (proved by `test/unit/fixtures/cart.spec.ts`).
 *
 * Defaults: id 1, quantity 1 of `makeProduct()`, in cart 1. The line's
 * money fields are the product's, and the totals are quantity times the
 * unit values — as `cart/models/item.py` computes them for a retail
 * (non-B2B) cart. `weightInfo` follows the product's weight. `uuid`
 * follows `id`. An explicit override of a derived field wins.
 *
 * ```ts
 * makeCartItem({ quantity: 3, product: { stock: 2 } }) // a stock issue
 * ```
 */
export function makeCartItem(overrides: CartItemOverrides = {}): CartItem {
  const { product: productOverrides, ...rest } = overrides
  const product = makeProduct(productOverrides)
  const id = rest.id ?? 1
  const quantity = rest.quantity ?? 1
  const unitWeight = product.weight?.value ?? 0

  return {
    id,
    cartId: fixtureUuid(2, 1),
    product,
    quantity,
    weightInfo: {
      unitWeight,
      totalWeight: unitWeight * quantity,
      weightUnit: product.weight?.unit ?? 'g',
    },
    price: product.price,
    finalPrice: product.finalPrice,
    discountValue: product.discountValue,
    priceSavePercent: product.priceSavePercent,
    discountPercent: product.discountPercent ?? 0,
    vatPercent: product.vatPercent,
    vatValue: product.vatValue,
    totalPrice: cents(product.finalPrice * quantity),
    totalDiscountValue: cents(product.discountValue * quantity),
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    uuid: fixtureUuid(3, id),
    ...rest,
  }
}

/**
 * A `CartDetail` (the `/api/cart` payload) valid against the generated
 * `zCartDetail` (proved by `test/unit/fixtures/cart.spec.ts`).
 *
 * Defaults: cart 1 in EUR holding one `makeCartItem()`, no promotions,
 * no coupons, retail pricing (`b2bPricing: null`), no recommendations.
 * `makeCart({ items: [] })` is an empty cart. Every item's `cartId` is
 * this cart's `uuid` unless the item says otherwise.
 *
 * The totals — `totalPrice`, `totalDiscountValue`, `totalVatValue`,
 * `totalItems`, `totalItemsUnique`, `totalWeightGrams` (item weights
 * taken as grams, the fixture default) — are sums over the items, as
 * `cart/models/cart.py` computes them, so a spec that changes an item's
 * quantity gets a consistent cart. Promotion fields do NOT reduce
 * `totalPrice`: Django reports the promotion discount separately in
 * `promotionDiscount`. An explicit override wins.
 *
 * ```ts
 * makeCart({ items: [{ id: 1 }, { id: 2, product: { id: 2, stock: 0 } }] })
 * ```
 */
export function makeCart(overrides: CartOverrides = {}): CartDetail {
  const { items: itemOverrides = [{}], ...rest } = overrides
  const id = rest.id ?? 1
  const uuid = rest.uuid ?? fixtureUuid(2, id)
  const items = itemOverrides.map(item => makeCartItem({ cartId: uuid, ...item }))
  const sum = (pick: (item: CartItem) => number) =>
    cents(items.reduce((total, item) => total + pick(item), 0))

  return {
    id,
    user: null,
    uuid,
    items,
    totalPrice: sum(item => item.totalPrice),
    totalDiscountValue: sum(item => item.totalDiscountValue),
    totalVatValue: sum(item => item.vatValue * (item.quantity ?? 0)),
    totalItems: items.reduce((total, item) => total + (item.quantity ?? 0), 0),
    totalItemsUnique: items.length,
    totalWeightGrams: Math.round(sum(item => item.weightInfo.totalWeight)),
    currency: 'EUR',
    promotionDiscount: 0,
    appliedPromotions: [],
    promotionFreeShipping: false,
    appliedCouponCodes: [],
    promotionGiftItems: [],
    promotionNearMiss: [],
    b2bPricing: null,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    lastActivity: FIXTURE_TIMESTAMP,
    recommendations: [],
    ...rest,
  }
}
