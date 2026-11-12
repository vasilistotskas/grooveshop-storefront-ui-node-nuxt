/**
 * What a band of products is, from the list it was asked for: the order of a
 * rule, or `picked` for the merchant's own list. It names the band (its
 * heading when the operator wrote none) and decides where "see all" opens.
 */
export type ProductRailKind = ProductOrdering | 'picked'

export function productRailKind(descriptor: DataDescriptor<'product'>): ProductRailKind {
  return descriptor.mode === 'filter' ? descriptor.ordering : 'picked'
}

/**
 * The listing's sort for the orders it has one for: the listing sorts by the
 * same Meilisearch fields a rule orders by (see the allowlist in
 * `Products/Toolbar.vue`), so a rail of new arrivals opens the listing
 * newest-first. The others have no listing sort and open it as it is.
 */
export const PRODUCT_LISTING_SORT: Partial<Record<ProductRailKind, string>> = {
  mostViewed: '-viewCount',
  newest: '-createdAt',
  mostLiked: '-likesCount',
}

/**
 * The listing's filter that matches a rule which hides sold-out products
 * (`stock: 'inStockOnly'`): the listing's own in-stock filter, `?inStock=true`
 * (`app/utils/productFilters.ts`), so "see all" opens what the band promised.
 * In-stock-first has no listing twin (the listing orders by its sort alone),
 * and a hand-picked list carries no stock rule.
 */
export function productRailStockQuery(descriptor: DataDescriptor<'product'>): { inStock?: 'true' } {
  return descriptor.mode === 'filter' && descriptor.stock === 'inStockOnly' ? { inStock: 'true' } : {}
}
