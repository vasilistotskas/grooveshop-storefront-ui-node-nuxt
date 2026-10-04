/**
 * What the checkout charges, line by line: the cart's offers (each by
 * name, summing to `promotionDiscount`), the delivery once a method is
 * chosen, the pay way's fee on the payment page, the points redeemed and
 * the gift cards — and the total. The order summary renders these; the
 * page's "Pay …" button names the same total.
 *
 * Every figure mirrors Django's own computation (the order-create
 * response is authoritative):
 * - a promotion granting free shipping waives the delivery price;
 * - the pay way's fee is waived once the discounted items plus delivery
 *   reach its free threshold;
 * - gift cards are payment, applied last, capped at what is due, and a
 *   partial cover leaves at least 0,50 € for the provider minimum (the
 *   sliver stays on the card).
 *
 * `shippingPrice` is `null` while the live options have not priced the
 * chosen method (loading, or an options error) — there is no local
 * flat-rate fallback, so the summary shows "—" and adds nothing.
 */
export interface CheckoutTotalsInputs {
  shippingPrice: MaybeRefOrGetter<number | null>
  /** Whether a delivery method is chosen, so its price counts. */
  includeShipping: MaybeRefOrGetter<boolean>
  /** Whether the pay way's fee counts (the payment page). */
  includePaymentFee: MaybeRefOrGetter<boolean>
  loyaltyDiscount: MaybeRefOrGetter<number>
  /** The balances of the gift cards the shopper attached. */
  giftCardBalance: MaybeRefOrGetter<number>
}

/** The provider's minimum charge a partial gift-card cover leaves behind. */
const PROVIDER_MINIMUM = 0.5

export function useCheckoutTotals(inputs: CheckoutTotalsInputs) {
  const { cart } = storeToRefs(useCartStore())
  const payWay = useState<PayWay | null>('selectedPayWay')

  const promotionDiscount = computed(() => Number(cart.value?.promotionDiscount ?? 0))
  const appliedPromotions = computed(() => cart.value?.appliedPromotions ?? [])
  const promotionFreeShipping = computed(() => Boolean(cart.value?.promotionFreeShipping))

  /** The delivery as charged: waived by a free-shipping promotion; `null` while unpriced. */
  const shipping = computed<number | null>(() =>
    promotionFreeShipping.value ? 0 : toValue(inputs.shippingPrice))

  const shippingCharged = computed(() => toValue(inputs.includeShipping) ? (shipping.value ?? 0) : 0)

  const payWayCost = computed(() => {
    if (!payWay.value) return 0
    const feeBase = payWayFeeBase({
      totalPrice: cart.value?.totalPrice || 0,
      promotionDiscount: promotionDiscount.value,
      shipping: shippingCharged.value,
    })
    return payWayDisplayCost(payWay.value, feeBase).cost
  })

  const paymentFee = computed(() => toValue(inputs.includePaymentFee) ? payWayCost.value : 0)

  /** What is due before gift cards, which are payment and applied last. */
  const preGiftCardTotal = computed(() => {
    if (!cart.value) return 0
    return Math.max(
      0,
      cart.value.totalPrice
      - promotionDiscount.value
      + shippingCharged.value
      + paymentFee.value
      - toValue(inputs.loyaltyDiscount),
    )
  })

  const giftCardApplied = computed(() => {
    const balance = toValue(inputs.giftCardBalance)
    if (balance <= 0) return 0
    const due = preGiftCardTotal.value
    if (balance >= due) return due
    const remainder = due - balance
    if (remainder > 0 && remainder < PROVIDER_MINIMUM) return Math.max(0, due - PROVIDER_MINIMUM)
    return balance
  })

  const total = computed(() => Math.max(0, preGiftCardTotal.value - giftCardApplied.value))

  return {
    promotionDiscount,
    appliedPromotions,
    shipping,
    payWayCost,
    paymentFee,
    giftCardApplied,
    total,
  }
}
