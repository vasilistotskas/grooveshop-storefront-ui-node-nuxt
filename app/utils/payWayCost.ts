/**
 * What Django waives a pay way's fee on: the items AFTER promotions plus
 * the delivery charged. Every caller of
 * ``OrderService.calculate_payment_method_fee`` (order creation, the
 * payment-first path, the cart's payment intent) hands it
 * ``cart_total - promo_discount + shipping_cost``, and a free-shipping
 * promotion makes ``shipping_cost`` zero. The payment step's cards and
 * the order summary both read it from here, so they cannot disagree.
 */
export function payWayFeeBase(cart: {
  totalPrice: number
  promotionDiscount: number
  /** The delivery as charged: 0 under a free-shipping promotion. */
  shipping: number
}): number {
  return Math.max(0, cart.totalPrice - cart.promotionDiscount + cart.shipping)
}

/**
 * The surcharge a pay way costs the shopper, as the checkout shows it,
 * waived once ``feeBase`` (``payWayFeeBase``) reaches the threshold.
 * Comparing the cart total alone showed a surcharge the shopper was never
 * charged — at items 48,00 € the backend sees 50,99 € and waives, while
 * the page displayed "+2,99 €".
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
