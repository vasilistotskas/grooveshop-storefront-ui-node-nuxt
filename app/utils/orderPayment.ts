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
 * split as Django's `order_page_path` (`src/order/storefront_links.py`), which
 * the order emails link to.
 */
export function orderPageLocation(order: Pick<OrderDetail, 'id' | 'uuid' | 'user'>, readerId: number | undefined) {
  return readerId !== undefined && order.user === readerId
    ? { name: 'account-orders-id' as const, params: { id: String(order.id) } }
    : { name: 'checkout-success-uuid' as const, params: { uuid: order.uuid } }
}

const AWAITING_PAYMENT_KEY = 'order-awaiting-payment'

/** What the browser keeps: the order's uuid, and until when it can be paid. */
export interface AwaitingPaymentOrder {
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
 * since the order outlives the tab; where it cannot be used (a private
 * window, storage full or off) nothing is kept and there is no reminder.
 * Browser only.
 */
export function rememberAwaitingPaymentOrder(uuid: string, until: string): void {
  const kept: AwaitingPaymentOrder = { uuid, until }
  try {
    localStorage.setItem(AWAITING_PAYMENT_KEY, JSON.stringify(kept))
  }
  catch (error) {
    // Storage unavailable or full (a private window): no reminder, and
    // nothing else is held up by it, a payment's redirect least of all.
    log.warn({ action: 'order:awaitingPayment:notKept', error })
  }
}

function dropKeptOrder(): void {
  try {
    localStorage.removeItem(AWAITING_PAYMENT_KEY)
  }
  catch {
    // Nothing was kept where storage is unavailable.
  }
}

function keptOrder(): AwaitingPaymentOrder | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(AWAITING_PAYMENT_KEY)
  }
  catch {
    return null
  }
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
  dropKeptOrder()
  return null
}

/** The kept order while it can still be paid; one past its deadline is dropped. */
export function keptAwaitingPaymentOrder(): AwaitingPaymentOrder | null {
  const kept = keptOrder()
  if (!kept) return null
  if (!(Date.parse(kept.until) > Date.now())) {
    dropKeptOrder()
    return null
  }
  return kept
}

/** The kept order's uuid while it can still be paid. */
export function readAwaitingPaymentOrder(): string | null {
  return keptAwaitingPaymentOrder()?.uuid ?? null
}

/** Moves the deadline of the kept order, when it is this one, to a new link's. */
export function extendAwaitingPaymentOrder(uuid: string, until: string): void {
  if (keptOrder()?.uuid === uuid) {
    rememberAwaitingPaymentOrder(uuid, until)
  }
}

/**
 * Takes the deadline a read of the order found, unless the kept order
 * changed while the read was on its way (`seen` is what was kept when it
 * started): a link opened meanwhile, in another tab, is newer than the read.
 */
export function updateAwaitingPaymentOrder(seen: AwaitingPaymentOrder, until: string): void {
  const kept = keptOrder()
  if (kept?.uuid === seen.uuid && kept.until === seen.until) {
    rememberAwaitingPaymentOrder(seen.uuid, until)
  }
}

/** Forgets the order, unless a newer one has taken its place. */
export function forgetAwaitingPaymentOrder(uuid: string): void {
  if (keptOrder()?.uuid === uuid) {
    dropKeptOrder()
  }
}
