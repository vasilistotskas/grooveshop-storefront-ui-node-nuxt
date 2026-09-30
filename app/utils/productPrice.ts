/**
 * What the shopper would otherwise have paid for a product — the number a
 * listing strikes through next to `displayPrice`, or `undefined` when there
 * is nothing to strike.
 *
 * NOT `product.price`, which is the NET price: Django computes
 * `final_price = price + vat - discount` (`product/models/product.py`), so
 * on a VAT-bearing product the net is below the final price — striking it
 * showed the price going up, and comparing it with the final price hid most
 * discounts entirely. Pre-discount and VAT-inclusive is
 * `finalPrice + discountValue`.
 *
 * A wholesale (B2B) price below the retail one strikes the retail price.
 */
export function productWasPrice(
  product: Pick<Product, 'finalPrice' | 'discountValue'>,
  displayPrice: number,
): number | undefined {
  if (displayPrice < product.finalPrice) return product.finalPrice
  return product.discountValue > 0 ? product.finalPrice + product.discountValue : undefined
}
