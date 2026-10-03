/**
 * The stock to warn a shopper of ("only 3 left"), or `null` when there
 * is nothing to say: sold out has its own message, and plenty needs none.
 *
 * Low is the merchant's per-product threshold, or 10 for a product
 * without one. The product card and the product page read the same
 * rule, so a product that says "only 3 left" in the listing says it on
 * its own page too.
 */
export function lowStockLeft(product: { stock?: number | null, lowStockThreshold?: number | null }): number | null {
  const stock = product.stock ?? 0
  if (stock <= 0) return null
  const threshold = product.lowStockThreshold
  return stock <= (typeof threshold === 'number' && threshold > 0 ? threshold : 10) ? stock : null
}
