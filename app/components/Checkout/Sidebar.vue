<script lang="ts" setup>
/**
 * The checkout's order summary, as the boards draw it: "Your order" with
 * "Edit" back to the cart, the lines, the coupon / gift-card / points
 * fields the page puts in, then the charges — subtotal, each offer by
 * name, free gifts, points and gift cards, the delivery ("Calculated
 * next" until a method is chosen) and the pay way's fee on the payment
 * page — and the total. Every figure is Django's quote (`useCheckoutQuote`),
 * the one the page's "Pay …" button names and the order is placed at;
 * until the quote prices the delivery and the pay way, the total is
 * "at payment" rather than a sum worked out here.
 *
 * A plain `<div>`, not an `<aside>`: the checkout layout renders it
 * inside `<main>`, and a landmark nested in a landmark is an axe error;
 * it summarises the form beside it rather than being tangential to it.
 */
const props = defineProps<{
  /** The checkout's quote, `null` until Django answered one. */
  quote: CheckoutQuote | null
  /** Whether a delivery method is chosen, so its price counts. */
  includeShipping: boolean
  /** The points redemption the page holds, for the points it names, or `null`. */
  loyalty: { points: number } | null
  /** Why Django refused the quote, said where the total would be; `null` while it answers. */
  quoteRefusal?: string | null
}>()

defineSlots<{
  'items'(props: object): any
  'coupon'(props: object): any
  'gift-card'(props: object): any
  'loyalty'(props: object): any
  'points-earned'(props: object): any
}>()

const { t, n } = useStoreI18n('components/Checkout/Sidebar')
const localePath = useLocalePath()
const { cart } = storeToRefs(useCartStore())
const payWay = useState<PayWay | null>('selectedPayWay')
const { getPaymentMethodName } = usePaymentMethod()
const { rejectionMessage } = usePromotionOffer()

const shipping = computed(() => props.quote?.shipping?.price ?? null)
const paymentFee = computed(() => props.quote?.paymentMethodFee?.amount ?? 0)
const loyaltyDiscount = computed(() => props.quote?.loyaltyDiscount ?? 0)
const giftCardAmount = computed(() => props.quote?.giftCardAmount ?? 0)

// A pay way may carry no key (the field is optional in the schema):
// the row then says what it is, generically.
const payWayName = computed(() => {
  const key = payWay.value?.key
  return key ? getPaymentMethodName(key) : t('pay_way_fee')
})

const minus = (amount: number) => `−${n(amount, 'currency')}`
</script>

<template>
  <div
    id="checkout-sidebar"
    class="
      flex flex-col gap-5 rounded-[1.25rem] bg-default p-5 ring ring-default
      sm:p-6
    "
  >
    <div class="flex items-baseline justify-between gap-3">
      <h2 class="font-display text-xl font-bold text-highlighted">
        {{ t('title') }}
      </h2>
      <ULink
        :to="localePath('cart')"
        class="text-sm font-semibold text-accent"
      >
        {{ t('edit') }}
      </ULink>
    </div>

    <slot name="items" />

    <div class="flex flex-col gap-3 border-t border-default pt-5">
      <slot name="coupon" />
      <slot name="gift-card" />
      <slot name="loyalty" />
    </div>

    <!-- The line prices already carry the group pricing (computed on the
         cart); this says why they differ from the catalogue. -->
    <UBadge
      v-if="cart?.b2bPricing?.applied"
      :label="cart.b2bPricing.groupName ? t('b2b_pricing_applied', { group: cart.b2bPricing.groupName }) : t('b2b_pricing_applied_generic')"
      icon="i-lucide-building-2"
      color="info"
      variant="soft"
      class="w-full justify-center"
    />
    <!-- A coupon attached to the cart that order creation would refuse
         (the quote's `blockingCoupon`): said before «Place order», with
         Django's reason, so the order is not refused for it. -->
    <UAlert
      v-if="quote?.blockingCoupon"
      :title="t('coupon_blocked', { code: quote.blockingCoupon.code })"
      :description="`${rejectionMessage(quote.blockingCoupon.reason)}. ${t('coupon_blocked_hint')}`"
      icon="i-lucide-ticket-x"
      color="warning"
      variant="soft"
    />
    <UAlert
      v-if="cart?.b2bPricing?.belowMinimum"
      :description="t('b2b_below_minimum', { minimum: n(Number(cart.b2bPricing.minOrderValue ?? 0), 'currency') })"
      icon="i-lucide-triangle-alert"
      color="warning"
      variant="soft"
    />

    <dl class="flex flex-col gap-2.5 text-sm">
      <div class="flex justify-between gap-3">
        <dt class="text-toned">
          {{ t('subtotal') }}
        </dt>
        <dd class="font-mono text-highlighted">
          {{ quote ? n(quote.itemsSubtotal, 'currency') : '—' }}
        </dd>
      </div>
      <!-- One row per offer that took money off, so the shopper sees which
           applied; a coupon is credited only with what it earned. -->
      <div
        v-for="promo in quote?.appliedPromotions ?? []"
        :key="`promo-${promo.promotionId}-${promo.code ?? 'auto'}`"
        class="flex justify-between gap-3 text-success"
      >
        <dt>{{ promo.code ? t('coupon', { code: promo.code }) : (promo.name || t('promotion_discount')) }}</dt>
        <dd class="shrink-0 font-mono">
          {{ minus(Number(promo.amount ?? 0)) }}
        </dd>
      </div>
      <CheckoutGiftItem
        v-for="gift in cart?.promotionGiftItems ?? []"
        :key="`gift-${gift.promotionId}-${gift.productId}`"
        :gift="gift"
      />
      <div
        v-if="loyaltyDiscount > 0"
        class="flex justify-between gap-3 text-success"
      >
        <dt>{{ t('loyalty_discount', { points: n(loyalty?.points ?? 0) }) }}</dt>
        <dd class="font-mono">
          {{ minus(loyaltyDiscount) }}
        </dd>
      </div>
      <div
        v-if="giftCardAmount > 0"
        class="flex justify-between gap-3 text-success"
      >
        <dt>{{ t('gift_card') }}</dt>
        <dd class="font-mono">
          {{ minus(giftCardAmount) }}
        </dd>
      </div>
      <div class="flex justify-between gap-3">
        <dt class="text-toned">
          {{ t('shipping') }}
        </dt>
        <dd class="font-mono text-highlighted">
          <template v-if="!includeShipping">
            {{ t('calculated_next') }}
          </template>
          <template v-else-if="shipping === null">
            —
          </template>
          <span
            v-else-if="shipping === 0"
            class="text-success"
          >{{ t('free') }}</span>
          <template v-else>
            {{ n(shipping, 'currency') }}
          </template>
        </dd>
      </div>
      <div
        v-if="paymentFee > 0"
        class="flex justify-between gap-3"
      >
        <dt class="text-toned">
          {{ payWayName }}
        </dt>
        <dd class="font-mono text-highlighted">
          {{ n(paymentFee, 'currency') }}
        </dd>
      </div>
    </dl>

    <div class="flex flex-col gap-1 border-t border-default pt-4">
      <div class="flex items-baseline justify-between gap-3">
        <span class="font-semibold text-highlighted">{{ t('total') }}</span>
        <span
          v-if="quote?.amountDue != null"
          class="font-mono text-xl font-bold text-highlighted"
        >{{ n(quote.amountDue, 'currency') }}</span>
        <span
          v-else-if="quoteRefusal"
          class="font-mono text-xl font-bold text-highlighted"
        >—</span>
        <span
          v-else
          class="text-sm text-toned"
        >{{ t('calculated_at_payment') }}</span>
      </div>
      <p
        v-if="quote?.amountDue == null && quoteRefusal"
        role="status"
        class="text-sm text-warning"
      >
        {{ t('quote_refused', { reason: quoteRefusal }) }}
      </p>
      <p
        v-if="cart?.totalVatValue"
        class="text-xs text-toned"
      >
        {{ t('vat_items', { amount: n(cart.totalVatValue, 'currency') }) }}
      </p>
    </div>

    <slot name="points-earned" />
  </div>
</template>

<i18n lang="yaml">
el:
  title: Η παραγγελία σου
  edit: Αλλαγή
  subtotal: Υποσύνολο
  coupon: Κουπόνι {code}
  shipping: Αποστολή
  calculated_next: Στο επόμενο βήμα
  calculated_at_payment: Υπολογίζεται στην πληρωμή
  quote_refused: "Δεν υπολογίστηκε το σύνολο: {reason}"
  coupon_blocked: Το κουπόνι {code} δεν ισχύει για αυτή την παραγγελία
  coupon_blocked_hint: Αφαίρεσέ το από το καλάθι για να ολοκληρώσεις την παραγγελία.
  free: Δωρεάν
  total: Σύνολο
  vat_items: Περιλαμβάνεται ΦΠΑ προϊόντων {amount}
  pay_way_fee: Χρέωση τρόπου πληρωμής
  loyalty_discount: Εξαργύρωση πόντων ({points})
  promotion_discount: Έκπτωση προσφοράς
  gift_card: Δωροκάρτα
  b2b_pricing_applied: "Τιμές χονδρικής: {group}"
  b2b_pricing_applied_generic: Τιμές χονδρικής
  b2b_below_minimum: Η ελάχιστη αξία παραγγελίας χονδρικής είναι {minimum}. Πρόσθεσε προϊόντα για να ολοκληρώσεις την παραγγελία.
en:
  title: Your order
  edit: Edit
  subtotal: Subtotal
  coupon: Coupon {code}
  shipping: Delivery
  calculated_next: Calculated next
  calculated_at_payment: Calculated at payment
  quote_refused: "The total could not be worked out: {reason}"
  coupon_blocked: Coupon {code} cannot be used with this order
  coupon_blocked_hint: Remove it from your cart to place the order.
  free: Free
  total: Total
  vat_items: Includes {amount} VAT on the items
  pay_way_fee: Payment method fee
  loyalty_discount: Points redeemed ({points})
  promotion_discount: Offer discount
  gift_card: Gift card
  b2b_pricing_applied: "Wholesale prices: {group}"
  b2b_pricing_applied_generic: Wholesale prices
  b2b_below_minimum: The minimum wholesale order value is {minimum}. Add more items to place the order.
</i18n>
