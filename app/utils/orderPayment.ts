/**
 * Whether the shopper may be offered a new payment link for an order, read
 * from what Django serves on the order (`OrderDetailSerializer`):
 *
 * - `paymentHoldExpiresAt` is set only while the order waits for an online
 *   payment (PENDING, an online pay way, a payment that is not final);
 * - `paymentAwaitsReview`: the provider took a charge that did not match the
 *   total, and Django says not to offer a new link;
 * - a PROCESSING payment is one the provider is already deciding, which a
 *   second link could charge again.
 *
 * Whether the time is still open is not read here: the deadline is
 * `paymentHoldExpiresAt`, which the page compares with the browser's clock,
 * and Django refuses a link past it (`payment_window_expired`).
 */
export function offersPaymentLink(
  order: Pick<OrderDetail, 'paymentHoldExpiresAt' | 'paymentAwaitsReview' | 'paymentStatus'>,
): boolean {
  return order.paymentHoldExpiresAt !== null
    && !order.paymentAwaitsReview
    && order.paymentStatus !== zPaymentStatusEnum.enum.PROCESSING
}

/**
 * Django's refusals of a payment link that end the offer: the order was paid
 * or closed (`order_not_payable`), or its time to be paid ran out
 * (`payment_window_expired`). Any other failure may pass, so the shopper may
 * try again.
 */
export const PAYMENT_LINK_CLOSED_CODES: readonly string[] = ['order_not_payable', 'payment_window_expired']

/**
 * The page of an order that opens for its reader: the account's order page
 * for a signed-in shopper's own order, the order confirmation (opened by the
 * uuid) for any other. The same split as Django's `order_page_path`
 * (`order/storefront_links.py`), which the order emails link to.
 */
export function orderPageLocation(order: Pick<OrderDetail, 'id' | 'uuid' | 'user'>, signedIn: boolean) {
  return signedIn && order.user
    ? { name: 'account-orders-id' as const, params: { id: String(order.id) } }
    : { name: 'checkout-success-uuid' as const, params: { uuid: order.uuid } }
}

const AWAITING_PAYMENT_KEY = 'order-awaiting-payment'

/**
 * The order this browser's checkout placed that waits for its online
 * payment, by uuid. Django keeps the cart while such an order is unpaid, so
 * a shopper who left the provider's page finds the same cart and could order
 * it again: the cart and the checkout read this to point at the order
 * instead (`useAwaitingPaymentOrder`). Kept in `localStorage`, like the
 * checkout's own per-order marks, since the order outlives the tab; the uuid
 * already belongs to this browser, which placed the order. Browser only.
 */
export function rememberAwaitingPaymentOrder(uuid: string): void {
  localStorage.setItem(AWAITING_PAYMENT_KEY, uuid)
}

export function readAwaitingPaymentOrder(): string | null {
  return localStorage.getItem(AWAITING_PAYMENT_KEY)
}

/** Forgets the order, unless a newer one has taken its place. */
export function forgetAwaitingPaymentOrder(uuid: string): void {
  if (localStorage.getItem(AWAITING_PAYMENT_KEY) === uuid) {
    localStorage.removeItem(AWAITING_PAYMENT_KEY)
  }
}
