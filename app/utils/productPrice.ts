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

/**
 * What a shopper pays for a product: the wholesale (B2B) price when they
 * have one below the retail price, else the retail price. Retail is the
 * payload's `finalPrice`; the wholesale row comes from `useB2BPricing`.
 */
export function shopperFinalPrice<R extends number | null | undefined>(
  retail: R,
  wholesale: Pick<B2bPrice, 'finalPrice'> | undefined,
): R | number {
  return wholesale && Number(wholesale.finalPrice) < (retail ?? 0)
    ? Number(wholesale.finalPrice)
    : retail
}
