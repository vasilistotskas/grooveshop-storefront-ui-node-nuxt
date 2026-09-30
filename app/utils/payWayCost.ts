/**
 * The surcharge a pay way costs the shopper, as the checkout shows it.
 *
 * Django waives the fee on items + shipping
 * (``OrderService.calculate_payment_method_fee`` is handed
 * ``cart_total + shipping_cost``), so ``feeBase`` must be that same sum:
 * comparing the cart total alone showed a surcharge the shopper was
 * never charged — at items 48,00 € the backend sees 50,99 € and waives,
 * while the page displayed "+2,99 €".
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
  feeBase: number,
): PayWayDisplayCost {
  const threshold = payWay.freeThreshold || 0
  const cost = (threshold > 0 && feeBase >= threshold) ? 0 : (payWay.cost || 0)
  return {
    cost,
    freeAbove: cost > 0 && threshold > 0 ? threshold : null,
  }
}
