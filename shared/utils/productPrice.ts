/** The fields every product-shaped payload (list, detail, search hit) carries. */
type CurrentPriceFields = { finalPrice: number, effectivePrice?: number | null }
type ReductionFields = { priorPrice?: number | null, announcedDiscountPercent?: number | null }

/** A price reduction a shopper may be told about (EU Omnibus rule). */
export interface PriceAnnouncement {
  /** The lowest price of the 30 days before the reduction started. */
  priorPrice: number
  /** Whole percent between `priorPrice` and the current price, as Django computed it. */
  percent: number
}

/**
 * What a consumer pays for a product now: `effectivePrice`, which already
 * counts the automatic promotions that need nothing from the basket and so
 * agrees with the cart. `finalPrice` stops at VAT and the markdown.
 * `effectivePrice` is null until the price has been recorded; the product
 * is then sold at its `finalPrice`.
 */
export function productCurrentPrice<F extends number | null | undefined>(
  product: { finalPrice: F, effectivePrice?: number | null },
): number | F {
  return product.effectivePrice ?? product.finalPrice
}

/**
 * The reduction a product may announce, or `undefined`. A struck-through
 * price, a percentage badge or offer wording is an announcement and needs
 * the prior price Django froze when the reduction started: never the list
 * price, the markdown or a recommended retail price.
 */
export function productAnnouncement(product: ReductionFields): PriceAnnouncement | undefined {
  const { priorPrice, announcedDiscountPercent } = product
  return priorPrice != null && announcedDiscountPercent != null
    ? { priorPrice, percent: announcedDiscountPercent }
    : undefined
}

/**
 * The number a listing strikes through next to `displayPrice`, or
 * `undefined` when there is nothing to strike.
 *
 * A wholesale (B2B) price below the current retail price strikes the retail
 * price: a comparison between two prices on offer today, outside the
 * consumer rule. Otherwise only an announced reduction strikes its prior
 * price.
 */
export function productWasPrice(
  product: CurrentPriceFields & ReductionFields,
  displayPrice: number,
): number | undefined {
  const current = productCurrentPrice(product)
  if (displayPrice < current) return current
  return productAnnouncement(product)?.priorPrice
}

/**
 * What a shopper pays for a product: the wholesale (B2B) price when they
 * have one below the retail price, else the retail price. Retail is the
 * product's `productCurrentPrice`; the wholesale row comes from
 * `useB2BPricing`.
 */
export function shopperFinalPrice<R extends number | null | undefined>(
  retail: R,
  wholesale: Pick<B2bPrice, 'finalPrice'> | undefined,
): R | number {
  return wholesale && Number(wholesale.finalPrice) < (retail ?? 0)
    ? Number(wholesale.finalPrice)
    : retail
}
