<script lang="ts" setup>
/**
 * How far the shopper's cart is from free delivery, as a line of copy
 * over a meter — on the product page and the cart summary.
 *
 * The threshold is `useFreeShippingInfo()`'s `minThreshold`: the
 * smallest subtotal at which at least one active carrier ships free. No
 * per-carrier mention on purpose — the shopper picks the carrier in
 * checkout; this is the store's promise, not a quote.
 *
 * The cart total is per visitor, so a caller on a cached page (the
 * product page) renders this on the client only.
 */
const props = defineProps<{
  /** The cart's subtotal before shipping. */
  cartTotal: number
}>()

const { t, n } = useI18n()
const { data, pending, error } = await useFreeShippingInfo()

const threshold = computed(() => data.value?.minThreshold ?? 0)
const remaining = computed(() => Math.max(0, threshold.value - props.cartTotal))
const qualified = computed(() => remaining.value <= 0)
const progress = computed(() =>
  threshold.value > 0 ? Math.min(100, (props.cartTotal / threshold.value) * 100) : 0,
)

const shouldRender = computed(() => !pending.value && !error.value && threshold.value > 0)
</script>

<template>
  <div
    v-if="shouldRender"
    class="flex flex-col gap-2"
  >
    <p class="text-sm font-semibold text-highlighted">
      <i18n-t
        v-if="!qualified"
        keypath="progress"
      >
        <template #amount>
          <span class="font-mono">{{ n(remaining, 'currency') }}</span>
        </template>
      </i18n-t>
      <template v-else>
        {{ t('qualified') }}
      </template>
    </p>
    <UProgress
      :model-value="progress"
      :color="qualified ? 'success' : 'secondary'"
      size="md"
      :ui="{ base: 'bg-elevated' }"
      :aria-label="t('meter')"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  progress: Σου λείπουν {amount} για δωρεάν μεταφορικά
  qualified: Τα μεταφορικά σου είναι δωρεάν
  meter: Πρόοδος προς τα δωρεάν μεταφορικά
en:
  progress: You're {amount} away from free delivery
  qualified: Your delivery is free
  meter: Progress towards free delivery
</i18n>
