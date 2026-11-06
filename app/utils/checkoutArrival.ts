/**
 * How a shopper arrived at the order confirmation, kept in this tab, not the
 * address.
 *
 * An order's id opens a guest order without a login, and every tracker sends
 * the page's address with its hits. So the confirmation lives at the plain
 * `/checkout/success`, where the purchase events can fire, and the id stays in
 * `sessionStorage`: it survives a reload, the back button and a change of
 * language, and goes no further. `/checkout/success/{uuid}`, where a payment
 * provider returns a shopper, runs no trackers and forwards here
 * (`app/pages/checkout/success/[uuid].vue`). Browser only.
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

const STORAGE_KEY = 'checkout-arrival'

export function writeCheckoutArrival(arrival: CheckoutArrival): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(arrival))
}

/** The arrival in this tab, or none: the address was opened on its own. */
export function readCheckoutArrival(): CheckoutArrival | undefined {
  const stored = sessionStorage.getItem(STORAGE_KEY)
  if (!stored) return undefined
  try {
    const arrival = JSON.parse(stored) as Partial<CheckoutArrival> | null
    return typeof arrival?.orderUuid === 'string' && arrival.orderUuid
      ? arrival as CheckoutArrival
      : undefined
  }
  catch {
    return undefined
  }
}

/**
 * Whether this browser already reported an order's purchase. TikTok and OpenAI
 * do not dedup, and a reload or an older link from the history would count the
 * sale again, in this tab or another, so it is not kept with the arrival.
 */
export function isPurchaseReported(orderUuid: string): boolean {
  return localStorage.getItem(`checkout_purchase_reported_${orderUuid}`) !== null
}

export function markPurchaseReported(orderUuid: string): void {
  localStorage.setItem(`checkout_purchase_reported_${orderUuid}`, '1')
}
