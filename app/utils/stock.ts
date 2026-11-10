/**
 * The stock to warn a shopper of ("only 3 left"), or `null` when there
 * is nothing to say: sold out has its own message, and plenty needs none.
 *
 * Low is stock above 0 and at or below the product's own threshold, the
 * rule Django's `Product.stock_state` states. A threshold of 0 means the
 * store switched the warning off for that product, and a product without
 * a threshold (a search hit may carry `null`) has nothing to compare
 * with, so neither is ever low. Every card and the product page of every
 * design read this one rule, so a product that says "only 3 left" in the
 * listing says it on its own page too.
 */
export function lowStockLeft(product: { stock?: number | null, lowStockThreshold?: number | null }): number | null {
  const stock = product.stock ?? 0
  if (stock <= 0) return null
  return stock <= (product.lowStockThreshold ?? 0) ? stock : null
}
