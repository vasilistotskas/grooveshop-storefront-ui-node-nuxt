import type { CartQuote, CheckoutQuote } from '~~/shared/openapi/types.gen'

/**
 * A `CartQuote` as Django's `POST /api/v1/cart/quote` answers it, valid
 * against the generated `zCartQuote` (proved by
 * `test/unit/fixtures/checkoutQuote.spec.ts`).
 *
 * Defaults: a 60,00 € cart, no offer, delivered for 3,00 € and paid by
 * a pay way without a fee, nothing redeemed: 63,00 € due, stated back
 * as 6300 cents. A quote asked before a choice was made has that row
 * null, and with it the rows that need both (`unpricedQuote`).
 */
export function makeCartQuote(overrides: Partial<CartQuote> = {}): CartQuote {
  return {
    itemsSubtotal: 60,
    discountTotal: 0,
    appliedPromotions: [],
    blockingCoupon: null,
    freeThresholdValue: 60,
    shipping: { price: 3, waivedBy: null },
    paymentMethodFee: { amount: 0, waived: false },
    loyaltyDiscount: 0,
    giftCardAmount: 0,
    grandTotal: 63,
    amountDue: 63,
    currency: 'EUR',
    expectedTotal: { amount: 6300, currency: 'EUR' },
    shippingOptions: [],
    payWays: [],
    ...overrides,
  }
}

/** The quote of a cart whose delivery and pay way are not chosen yet. */
export function unpricedQuote(overrides: Partial<CartQuote> = {}): CartQuote {
  return makeCartQuote({
    shipping: null,
    paymentMethodFee: null,
    giftCardAmount: null,
    grandTotal: null,
    amountDue: null,
    expectedTotal: null,
    shippingOptions: null,
    ...overrides,
  })
}

/**
 * The quote a 409 `total_changed` carries under `error.quote`: the
 * rows alone, without the priced lists.
 */
export function makeCheckoutQuote(overrides: Partial<CheckoutQuote> = {}): CheckoutQuote {
  const { shippingOptions: _options, payWays: _payWays, ...quote } = makeCartQuote()
  return { ...quote, ...overrides }
}
