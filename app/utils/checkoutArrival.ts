/**
 * How a shopper arrives at the order confirmation, carried in the browser's
 * history state, not the address.
 *
 * An order's id opens a guest order without a login, and every tracker sends
 * the page's address with its hits. So the confirmation lives at the plain
 * `/checkout/success`, where the purchase events can fire, and the id stays in
 * this tab. The state survives a reload and the back button, and goes no further.
 * `/checkout/success/{uuid}`, where a payment provider returns a shopper, runs no
 * trackers and forwards here (`app/pages/checkout/success/[uuid].vue`).
 */
export interface CheckoutArrival {
  orderUuid: string
  /** Stripe's session, on a return from its checkout. */
  sessionId?: string
  /** Viva's order code, on a return from its checkout. */
  vivaOrderCode?: string
  /** An offline pay-way placed the order just now. */
  placed?: boolean
}

const STATE_KEY = 'checkoutArrival'

/** Where to go for an order's confirmation. `path` is the page's localized path. */
export function checkoutSuccessLocation(path: string, arrival: CheckoutArrival) {
  return { path, state: { [STATE_KEY]: { ...arrival } } }
}

/** The arrival in this history entry, or none: the address was opened on its own. */
export function readCheckoutArrival(state: unknown): CheckoutArrival | undefined {
  if (typeof state !== 'object' || state === null) return undefined
  const arrival = (state as Record<string, unknown>)[STATE_KEY]
  if (typeof arrival !== 'object' || arrival === null) return undefined
  const { orderUuid } = arrival as Partial<CheckoutArrival>
  return typeof orderUuid === 'string' && orderUuid ? arrival as CheckoutArrival : undefined
}
