/**
 * The surcharge a pay way costs the shopper, as the checkout shows it,
 * waived once ``freeThresholdValue`` reaches the pay way's threshold.
 *
 * ``freeThresholdValue`` is the cart's own ``freeThresholdValue``: the
 * ONE value Django judges "free above X" on, for the fee and for free
 * shipping alike (the products after promotion and coupon discounts,
 * without shipping or this fee). It is never recomputed here: a basis of
 * the storefront's own showed a charge, or a waiver, that Django then
 * disagreed with.
 *
 * ``freeAbove`` is the threshold that would waive the fee, set only
 * while the fee is actually being charged: once the threshold is met
 * there is no charge left to explain.
 */
export interface PayWayDisplayCost {
  cost: number
  freeAbove: number | null
}

export function payWayDisplayCost(
  payWay: Pick<PayWay, 'cost' | 'freeThreshold'>,
  freeThresholdValue: number,
): PayWayDisplayCost {
  const threshold = payWay.freeThreshold || 0
  const cost = (threshold > 0 && freeThresholdValue >= threshold) ? 0 : (payWay.cost || 0)
  return {
    cost,
    freeAbove: cost > 0 && threshold > 0 ? threshold : null,
  }
}
