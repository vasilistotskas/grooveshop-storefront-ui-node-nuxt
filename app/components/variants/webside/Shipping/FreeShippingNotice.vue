<script lang="ts" setup>
/**
 * "Δωρεάν μεταφορικά άνω των X €" notice for the PDP and cart summary.
 *
 * On the cart page it tells the cart's own `freeShippingProgress`:
 * Django's cheapest route to free delivery (a carrier's threshold or a
 * free-shipping offer), judged by the rules checkout prices delivery
 * with, so the line cannot promise what checkout will not give and the
 * offer is not told a second time as a teaser (`getOfferNearMisses`).
 *   - progress.free                → "Free shipping unlocked"
 *   - progress.remainingAmount     → "Add Y € for free shipping"
 *   - progress.remainingQuantity   → "Add N more items for free shipping"
 *   - progress null                → nothing: the cart has no route
 *
 * On the PDP (no `progress` passed) it is the store's standing promise,
 * `useFreeShippingInfo()`'s `minThreshold` — the earliest subtotal at
 * which at least one carrier ships free: "Free shipping over X €". No
 * carrier is named: the shopper picks one in checkout.
 */

const props = defineProps<{
  /**
   * The cart's `freeShippingProgress`. Omit on the PDP, which has no
   * cart context; `null` means the cart has no route to free shipping.
   */
  progress?: Cart['freeShippingProgress']
}>()

const { t, n } = useStoreI18n('components/variants/webside/Shipping/FreeShippingNotice')
const { data, pending, error } = await useFreeShippingInfo()

const minThreshold = computed(() => data.value?.minThreshold ?? null)

const state = computed<'idle' | 'progress' | 'quantity' | 'qualified' | null>(() => {
  const progress = props.progress
  if (progress === undefined) {
    if (pending.value || error.value) return null
    return minThreshold.value != null && minThreshold.value > 0 ? 'idle' : null
  }
  if (progress === null) return null
  if (progress.free) return 'qualified'
  if (progress.remainingAmount !== null) return 'progress'
  if (progress.remainingQuantity !== null) return 'quantity'
  return null
})

const title = computed(() => {
  switch (state.value) {
    case 'qualified':
      return t('qualified')
    case 'progress':
      return t('progress', { amount: n(props.progress?.remainingAmount ?? 0, 'currency') })
    case 'quantity': {
      const count = props.progress?.remainingQuantity ?? 0
      return t('progress_quantity', { count }, count)
    }
    default:
      return t('idle', { amount: n(minThreshold.value ?? 0, 'currency') })
  }
})

const icon = computed(() =>
  state.value === 'qualified'
    ? 'i-heroicons-check-badge'
    : 'i-heroicons-truck',
)

const color = computed<'success' | 'info'>(() =>
  state.value === 'qualified' ? 'success' : 'info',
)
</script>

<template>
  <UAlert
    v-if="state"
    :title="title"
    :icon="icon"
    :color="color"
    variant="soft"
  />
</template>

<i18n lang="yaml">
el:
  idle: Δωρεάν μεταφορικά σε αγορές άνω των {amount}
  progress: Πρόσθεσε ακόμα {amount} για δωρεάν μεταφορικά
  progress_quantity: 'Πρόσθεσε ακόμα {count} τεμάχιο για δωρεάν μεταφορικά | Πρόσθεσε ακόμα {count} τεμάχια για δωρεάν μεταφορικά'
  qualified: Έχεις δωρεάν μεταφορικά
</i18n>
