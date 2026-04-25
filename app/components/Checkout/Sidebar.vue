<script lang="ts" setup>
const props = defineProps({
  shippingPrice: { type: Number, required: true },
  showPaymentFee: { type: Boolean, default: false },
  loyaltyDiscount: { type: Number, default: 0 },
})

const { $i18n } = useNuxtApp()
const cartStore = useCartStore()
const { cart } = storeToRefs(cartStore)
const payWay = useState<PayWay | null>('selectedPayWay')
const localePath = useLocalePath()
const { t, locale } = useI18n()
const { getPaymentMethodName } = usePaymentMethod()

const payWayCost = computed(() => {
  if (!payWay?.value) return 0
  const cartTotal = cart.value?.totalPrice || 0
  const threshold = payWay.value.freeThreshold || 0

  // If cart total meets or exceeds the free threshold, no cost
  if (threshold > 0 && cartTotal >= threshold) {
    return 0
  }

  return payWay.value.cost || 0
})

const payWayName = computed(() => {
  const name = extractTranslated(payWay.value, 'name', locale.value) ?? t('pay_way_fee')

  if (name) {
    return getPaymentMethodName(name)
  }

  // Fallback to extracting translated name from backend
  return 'N/A'
})

const checkoutTotal = computed(() => {
  if (!cart.value) return 0
  const paymentFee = props.showPaymentFee ? payWayCost.value : 0
  return Math.max(0, cart.value.totalPrice + props.shippingPrice + paymentFee - props.loyaltyDiscount)
})

// VAT is baked into the cart's `totalPrice` (Greek retail convention).
// Surface the breakdown so customers see what they're paying in tax.
const vatAmount = computed(() => cart.value?.totalVatValue ?? 0)
const subtotalExclVat = computed(() => {
  const total = cart.value?.totalPrice ?? 0
  return Math.max(0, total - vatAmount.value)
})

defineSlots<{
  'pay-ways'(props: object): any
  'items'(props: object): any
  'loyalty'(props: object): any
  'points-earned'(props: object): any
  'button'(props: object): any
}>()
</script>

<template>
  <!--
    Plain <div> (no role) — axe flagged "Aside should not be
    contained in another landmark" because the checkout layout
    renders this sidebar inside <UMain> (the page's <main>
    landmark). Both <aside> and role="complementary" register as
    landmarks, so the only way to stop the nesting violation is to
    drop the landmark semantics entirely. The sidebar is a summary
    of the checkout form it sits next to, not tangential content,
    so losing the landmark role is also the right semantic call.
  -->
  <div id="checkout-sidebar">
    <UCard
      class="w-full"
      :ui="{
        body: `
          py-1
          sm:py-2
        `,
      }"
    >
      <template #header>
        <div class="flex items-center">
          <h3
            class="
              text-lg font-semibold text-primary-950
              dark:text-primary-50
            "
          >
            {{ t('title') }}
          </h3>
        </div>
      </template>

      <div class="space-y-4">
        <div
          class="
            border-primary-200
            dark:border-primary-800
          "
        >
          <slot name="items" />
        </div>

        <!-- Loyalty Points Redemption Slot -->
        <template v-if="$slots.loyalty">
          <slot name="loyalty" />
        </template>

        <div
          class="
            space-y-3 border-t border-primary-200 pt-4
            dark:border-primary-800
          "
        >
          <div class="flex items-center justify-between">
            <span
              class="
                text-primary-950
                dark:text-primary-50
              "
            >{{ t('items_unique') }}</span>
            <span
              class="
                font-bold text-primary-950
                dark:text-primary-50
              "
            >{{ cart?.totalItemsUnique }}</span>
          </div>
          <div
            v-if="vatAmount > 0"
            class="flex items-center justify-between"
          >
            <span class="text-neutral-600 dark:text-neutral-300">{{ t('subtotal_excl_vat') }}</span>
            <span class="text-primary-950 dark:text-primary-50">{{ $i18n.n(subtotalExclVat, 'currency') }}</span>
          </div>
          <div
            v-if="vatAmount > 0"
            class="flex items-center justify-between"
          >
            <span class="text-neutral-600 dark:text-neutral-300">{{ t('vat') }}</span>
            <span class="text-primary-950 dark:text-primary-50">{{ $i18n.n(vatAmount, 'currency') }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span
              class="
                text-primary-950
                dark:text-primary-50
              "
            >
              {{ t('shipping') }}
              <span class="block text-xs text-neutral-500 dark:text-neutral-400">{{ t('shipping_estimated') }}</span>
            </span>
            <span
              v-if="shippingPrice === 0"
              class="font-bold text-success"
            >{{ t('free') }}</span>
            <span
              v-else
              class="
                font-bold text-primary-950
                dark:text-primary-50
              "
            >{{ $i18n.n(shippingPrice, 'currency') }}</span>
          </div>
          <div
            v-if="showPaymentFee && payWayCost"
            class="flex items-center justify-between"
          >
            <span
              class="
                text-primary-950
                dark:text-primary-50
              "
            >{{ payWayName }}</span>
            <span
              class="
                font-bold text-primary-950
                dark:text-primary-50
              "
            >{{ $i18n.n(payWayCost, 'currency') }}</span>
          </div>
          <div
            v-if="loyaltyDiscount > 0"
            class="flex items-center justify-between"
          >
            <span class="text-success">{{ t('loyalty_discount') }}</span>
            <span class="font-bold text-success">-{{ $i18n.n(loyaltyDiscount, 'currency') }}</span>
          </div>
        </div>

        <!-- Points Earned Slot -->
        <div v-if="$slots['points-earned']" class="pt-1">
          <slot name="points-earned" />
        </div>

        <div
          class="
            flex items-center justify-between border-t border-primary-200 pt-4
            dark:border-primary-800
          "
        >
          <span
            class="
              text-lg font-bold text-primary-950
              dark:text-primary-50
            "
          >{{ t('total') }}</span>
          <span
            class="
              text-xl font-bold text-primary-600
              dark:text-primary-400
            "
          >{{ $i18n.n(checkoutTotal, 'currency') }}</span>
        </div>

        <div
          class="
            flex items-center gap-2 text-sm text-primary-600 pb-2
            dark:text-primary-400
          "
        >
          <UIcon
            name="i-heroicons-shield-check"
            class="size-6 text-green-500"
          />
          <span>{{ t('vat_included') }}</span>
        </div>
      </div>

      <template #footer>
        <div class="space-y-4">
          <slot name="button" />

          <UButton
            color="info"
            variant="ghost"
            size="sm"
            icon="i-heroicons-question-mark-circle"
            block
            :to="localePath('contact')"
            target="_blank"
          >
            {{ t('need_help') }}
          </UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Ολοκλήρωση αγοράς
  items_unique: Προϊόντα
  shipping: Μεταφορικά
  shipping_estimated: Εκτιμώμενα — οριστικοποιείται κατά την αγορά
  free: Δωρεάν
  total: Σύνολο
  pay_way_fee: Προμήθεια Τρόπου πληρωμής
  loyalty_discount: Έκπτωση πόντων
  vat_included: Στις τιμές συμπεριλαμβάνεται Φ.Π.Α.
  subtotal_excl_vat: Υποσύνολο (χωρίς Φ.Π.Α.)
  vat: Φ.Π.Α.
  need_help: Χρειάζεσαι βοήθεια;
</i18n>
