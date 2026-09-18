<script lang="ts" setup>
/**
 * "Δωρεάν μεταφορικά άνω των X €" notice for the PDP and cart summary.
 *
 * Data comes from ``useFreeShippingInfo()`` — the Nitro proxy returns
 * the aggregate ``minThreshold`` across active carriers, so the headline
 * number always matches the earliest cart subtotal at which at least
 * one carrier ships free. No per-carrier mention here on purpose: the
 * shopper picks the carrier in checkout; this is upstream marketing copy.
 *
 * Progressive messaging kicks in when ``cartTotal`` is provided:
 *   - cartTotal === null / undefined → "Free shipping over X €" (PDP)
 *   - cartTotal < min                → "Add Y € for free shipping"
 *   - cartTotal >= min               → "Free shipping unlocked"
 * The cart page passes its subtotal so the copy reflects the shopper's
 * actual progress; the PDP omits it because the PDP doesn't know cart
 * state and a "you need X more" line would mislead.
 */

const props = defineProps<{
  /**
   * Pre-shipping cart subtotal (already in the carrier's currency).
   * Omit on the PDP — the carrier has no cart context there.
   */
  cartTotal?: number | null
}>()

const { t, n } = useI18n()
const { data, pending, error } = await useFreeShippingInfo()

const minThreshold = computed(() => data.value?.minThreshold ?? null)

const formattedThreshold = computed(() => {
  if (minThreshold.value == null) return ''
  return n(minThreshold.value, 'currency')
})

const remainingToFree = computed(() => {
  if (minThreshold.value == null) return null
  if (props.cartTotal == null) return null
  const remaining = minThreshold.value - props.cartTotal
  return remaining > 0 ? remaining : 0
})

const formattedRemaining = computed(() => {
  if (remainingToFree.value == null) return ''
  return n(remainingToFree.value, 'currency')
})

const state = computed<'idle' | 'progress' | 'qualified'>(() => {
  if (props.cartTotal == null) return 'idle'
  if (remainingToFree.value == null) return 'idle'
  return remainingToFree.value <= 0 ? 'qualified' : 'progress'
})

const title = computed(() => {
  switch (state.value) {
    case 'qualified':
      return t('qualified')
    case 'progress':
      return t('progress', { amount: formattedRemaining.value })
    default:
      return t('idle', { amount: formattedThreshold.value })
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

const shouldRender = computed(() => {
  if (pending.value) return false
  if (error.value) return false
  return minThreshold.value != null && minThreshold.value > 0
})
</script>

<template>
  <UAlert
    v-if="shouldRender"
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
  qualified: Έχεις δωρεάν μεταφορικά
</i18n>
