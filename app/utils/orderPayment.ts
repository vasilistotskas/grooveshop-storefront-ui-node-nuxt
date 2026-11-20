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
 * for the order's owner, signed in (`readerId` is the signed-in shopper's
 * id), the order confirmation (opened by the uuid) for anyone else. The same
 * split as Django's `order_page_path` (`order/storefront_links.py`), which
 * the order emails link to.
 */
export function orderPageLocation(order: Pick<OrderDetail, 'id' | 'uuid' | 'user'>, readerId: number | undefined) {
  return readerId !== undefined && order.user === readerId
    ? { name: 'account-orders-id' as const, params: { id: String(order.id) } }
    : { name: 'checkout-success-uuid' as const, params: { uuid: order.uuid } }
}

const AWAITING_PAYMENT_KEY = 'order-awaiting-payment'

/** What the browser keeps: the order's uuid, and until when it can be paid. */
interface AwaitingPaymentOrder {
  uuid: string
  /** The order's `paymentHoldExpiresAt`, as the latest payment link set it. */
  until: string
}

/**
 * The order this browser's checkout placed that waits for its online
 * payment. Django keeps the cart while such an order is unpaid, so a shopper
 * who left the provider's page finds the same cart and could order it again:
 * the cart and the checkout read this to point at the order instead
 * (`useAwaitingPaymentOrder`).
 *
 * Strictly necessary storage, kept without a consent answer: it serves the
 * purchase the shopper started, paying for the order they placed, and
 * nothing else; it is read by no tracker and sent only to our own order
 * call. It holds the least that does that: the order's uuid (which this
 * browser already has, having placed the order) and its deadline, no amount
 * and nothing about the shopper. It lives no longer than the order can be
 * paid: a read past the deadline drops it unasked, a new payment link moves
 * the deadline with it (`extendAwaitingPaymentOrder`), and an order that is
 * paid, closed or gone is forgotten when it is next read. `localStorage`,
 * since the order outlives the tab. Browser only.
 */
export function rememberAwaitingPaymentOrder(uuid: string, until: string): void {
  const kept: AwaitingPaymentOrder = { uuid, until }
  localStorage.setItem(AWAITING_PAYMENT_KEY, JSON.stringify(kept))
}

function keptOrder(): AwaitingPaymentOrder | null {
  const raw = localStorage.getItem(AWAITING_PAYMENT_KEY)
  if (!raw) return null
  try {
    const kept = JSON.parse(raw) as Partial<AwaitingPaymentOrder> | null
    if (typeof kept?.uuid === 'string' && typeof kept.until === 'string') {
      return { uuid: kept.uuid, until: kept.until }
    }
  }
  catch {
    // Not ours to read: dropped below.
  }
  localStorage.removeItem(AWAITING_PAYMENT_KEY)
  return null
}

/** The order's uuid while it can still be paid; one past its deadline is dropped. */
export function readAwaitingPaymentOrder(): string | null {
  const kept = keptOrder()
  if (!kept) return null
  if (!(Date.parse(kept.until) > Date.now())) {
    localStorage.removeItem(AWAITING_PAYMENT_KEY)
    return null
  }
  return kept.uuid
}

/** Moves the deadline of the kept order, when it is this one, to a new link's. */
export function extendAwaitingPaymentOrder(uuid: string, until: string): void {
  if (keptOrder()?.uuid === uuid) {
    rememberAwaitingPaymentOrder(uuid, until)
  }
}

/** Forgets the order, unless a newer one has taken its place. */
export function forgetAwaitingPaymentOrder(uuid: string): void {
  if (keptOrder()?.uuid === uuid) {
    localStorage.removeItem(AWAITING_PAYMENT_KEY)
  }
}
