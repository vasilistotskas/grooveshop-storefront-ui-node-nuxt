<script lang="ts" setup>
/**
 * The cart page's order summary, as the board draws it: the coupon
 * field, then what the order comes to line by line — subtotal, each
 * offer that took money off, each free gift, delivery still to be
 * worked out — the total with the VAT it already holds, the points it
 * earns, the checkout button and the ways the store takes payment.
 *
 * The cart's figures are the server's: the subtotal is the gross
 * `totalPrice`, the offers' amounts come off it, and nothing here
 * recomputes a price. Delivery is not quoted — the shopper picks the
 * carrier in checkout.
 */
const { t, n, locale } = useI18n()
const localePath = useLocalePath()
const cartStore = useCartStore()
const { cart, hasStockIssues } = storeToRefs(cartStore)
const tenantStore = useTenantStore()
const { getPaymentMethodName } = usePaymentMethod()

const giftCardsRuntimeEnabled = useSettingFlag('GIFT_CARDS_ENABLED', {
  fallback: false,
})

// Same key and options as the footer's "Pay with" row, so the two share
// one request.
const { data: payWays } = useApi('/api/pay-way', {
  key: 'footer-pay-ways',
  query: { active: 'true', pageSize: 50 },
})

const paymentMarks = computed(() => [...new Set([
  ...(payWays.value?.results ?? [])
    .map(payWay => extractTranslated(payWay, 'name', locale.value))
    .filter((name): name is string => Boolean(name))
    .map(name => getPaymentMethodName(name)),
  ...(tenantStore.giftCardsEnabled && giftCardsRuntimeEnabled.value ? [t('gift_card')] : []),
])])

const total = computed(() =>
  Math.max(0, (cart.value?.totalPrice ?? 0) - (cart.value?.promotionDiscount ?? 0)),
)

/** "24%" when every line carries one rate; no rate when the lines differ. */
const vatRate = computed(() => {
  const rates = new Set((cart.value?.items ?? []).map(item => Number(item.vatPercent)))
  return rates.size === 1 ? [...rates][0] : null
})
</script>

<template>
  <section
    v-if="cart"
    :aria-label="t('title')"
    class="
      flex flex-col gap-5 rounded-[1.25rem] bg-default p-5 ring ring-default
      sm:p-6
    "
  >
    <h2 class="font-display text-xl font-bold text-highlighted">
      {{ t('title') }}
    </h2>

    <UBadge
      v-if="cart.b2bPricing?.applied"
      color="info"
      variant="soft"
      icon="i-lucide-briefcase"
      class="w-full justify-center"
    >
      {{ cart.b2bPricing.groupName
        ? t('b2b_pricing_applied', { group: cart.b2bPricing.groupName })
        : t('b2b_pricing_applied_generic') }}
    </UBadge>
    <UAlert
      v-if="cart.b2bPricing?.belowMinimum"
      color="warning"
      variant="soft"
      icon="i-lucide-triangle-alert"
      :description="t('b2b_below_minimum', {
        minimum: n(Number(cart.b2bPricing.minOrderValue ?? 0), 'currency'),
      })"
    />

    <CheckoutCouponInput />

    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class="flex flex-col gap-3 border-t border-default pt-5 text-sm"
    >
      <div class="flex justify-between gap-3">
        <span class="text-toned">{{ t('subtotal') }}</span>
        <span class="font-mono tabular-nums">{{ n(cart.totalPrice, 'currency') }}</span>
      </div>

      <!-- Catalogue markdown. It is ALREADY inside the line prices and
           is never subtracted again, so it reads as information. -->
      <div
        v-if="cart.totalDiscountValue > 0"
        class="flex justify-between gap-3 text-muted"
      >
        <span>{{ t('discount') }}</span>
        <span class="font-mono tabular-nums">-{{ n(cart.totalDiscountValue, 'currency') }}</span>
      </div>

      <!-- One line per offer that actually took money off. -->
      <div
        v-for="promo in cart.appliedPromotions || []"
        :key="`promo-${promo.promotionId}-${promo.code ?? 'auto'}`"
        class="flex items-start justify-between gap-3"
      >
        <span class="flex flex-wrap items-center gap-1.5 text-toned">
          {{ promo.name || t('promotion_discount') }}
          <UBadge
            v-if="promo.code"
            color="success"
            variant="soft"
            size="sm"
            class="font-mono"
          >
            {{ promo.code }}
          </UBadge>
        </span>
        <span class="shrink-0 font-mono tabular-nums">-{{ n(Number(promo.amount ?? 0), 'currency') }}</span>
      </div>

      <div
        v-for="gift in cart.promotionGiftItems || []"
        :key="`gift-${gift.promotionId}-${gift.productId}`"
        class="flex items-start justify-between gap-3"
      >
        <span class="flex min-w-0 items-center gap-1.5 text-toned">
          <UIcon
            name="i-lucide-gift"
            class="size-4 shrink-0"
            aria-hidden="true"
          />
          {{ t('gift', { name: gift.productName || gift.name || '' }) }}
        </span>
        <span class="shrink-0 font-mono tabular-nums">{{ t('free') }}</span>
      </div>

      <div class="flex justify-between gap-3">
        <span class="text-toned">{{ t('delivery') }}</span>
        <span class="font-mono tabular-nums">{{ t('delivery_next') }}</span>
      </div>

      <div class="flex items-baseline justify-between gap-3 border-t border-default pt-4">
        <span class="text-base font-bold text-highlighted">{{ t('total') }}</span>
        <span class="font-mono text-lg font-bold tabular-nums text-highlighted">{{ n(total, 'currency') }}</span>
      </div>
      <p class="text-xs text-toned">
        {{ vatRate === null ? t('vat_included') : t('vat_included_rate', { rate: vatRate }) }}
        <span class="font-mono tabular-nums">{{ n(cart.totalVatValue, 'currency') }}</span>
      </p>
    </div>

    <CheckoutPointsEarned />

    <!-- The tenant accent, solid. The stock-issue state keeps `warning`,
         which is paired with a dark foreground in app.config. -->
    <UButton
      :to="localePath('checkout')"
      :disabled="hasStockIssues"
      :color="hasStockIssues ? 'warning' : 'secondary'"
      icon="i-lucide-lock"
      size="xl"
      block
    >
      {{ hasStockIssues ? t('fix_stock_issues_first') : t('checkout') }}
    </UButton>

    <ChromeFooterMarks
      :marks="paymentMarks"
      :label="t('pay_with')"
    />
  </section>
</template>

<i18n lang="yaml">
el:
  title: Σύνοψη παραγγελίας
  b2b_pricing_applied: 'Τιμές χονδρικής: {group}'
  b2b_pricing_applied_generic: Τιμές χονδρικής
  b2b_below_minimum: Η ελάχιστη αξία παραγγελίας χονδρικής είναι {minimum}. Πρόσθεσε προϊόντα για να ολοκληρώσεις την παραγγελία.
  subtotal: Υποσύνολο
  discount: Έκπτωση προϊόντων (ήδη στις τιμές)
  promotion_discount: Έκπτωση προσφοράς
  gift: "Δωρεάν {name}"
  free: Δωρεάν
  delivery: Μεταφορικά
  delivery_next: Στο επόμενο βήμα
  total: Σύνολο
  vat_included: Περιλαμβάνεται ΦΠΑ
  vat_included_rate: "Περιλαμβάνεται ΦΠΑ ({rate}%)"
  checkout: Ολοκλήρωση παραγγελίας
  fix_stock_issues_first: Διόρθωσε τα προβλήματα
  pay_with: Πληρωμή με
  gift_card: Δωροκάρτα
en:
  title: Order summary
  b2b_pricing_applied: 'Wholesale prices: {group}'
  b2b_pricing_applied_generic: Wholesale prices
  b2b_below_minimum: The minimum wholesale order value is {minimum}. Add more items to place the order.
  subtotal: Subtotal
  discount: Product discount (already in the prices)
  promotion_discount: Offer discount
  gift: "Free {name}"
  free: Free
  delivery: Delivery
  delivery_next: Calculated next
  total: Total
  vat_included: VAT included
  vat_included_rate: "VAT included ({rate}%)"
  checkout: Checkout
  fix_stock_issues_first: Fix the problems first
  pay_with: Pay with
  gift_card: Gift card
</i18n>
