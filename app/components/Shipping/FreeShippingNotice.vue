<script lang="ts" setup>
/**
 * How far the shopper's cart is from free delivery, as a line of copy
 * over a meter — on the product page, the cart drawer and the cart page.
 *
 * The distance is the cart's own `freeShippingProgress`: Django weighs
 * every route checkout would honour (a carrier's threshold, a
 * free-shipping promotion, a promotion's coupon) and sends the cheapest,
 * so this line and checkout cannot disagree, and the free-shipping offer
 * is not told a second time as a teaser (`getOfferNearMisses`). No
 * carrier is named: the shopper picks one in checkout. Staging webside,
 * 2026-10-28: "add 19,01 € to unlock «free shipping from 39 €»" stood
 * next to "add 30,01 € for free shipping".
 *
 * A visitor with no cart yet (the product page) is told the store's own
 * threshold, `useFreeShippingInfo()`'s `minThreshold`, which is what
 * Django's progress says of an empty cart. The cart is per visitor, so a
 * caller on a cached page renders this on the client only.
 */
const { t, n } = useStoreI18n('components/Shipping/FreeShippingNotice')
const { cart } = storeToRefs(useCartStore())
const { data, pending, error } = await useFreeShippingInfo()

/** The store's promise to a visitor without a cart: all of the threshold to go. */
const storeThreshold = computed(() => data.value?.minThreshold ?? 0)

const progress = computed(() => {
  if (cart.value) return cart.value.freeShippingProgress
  if (pending.value || error.value || storeThreshold.value <= 0) return null
  return {
    free: false,
    remainingAmount: storeThreshold.value,
    remainingQuantity: null,
    threshold: storeThreshold.value,
  }
})

const meter = computed(() => {
  const route = progress.value
  if (!route) return null
  if (route.free) return 100
  if (route.remainingAmount === null || !route.threshold) return null
  return Math.min(100, Math.max(0, ((route.threshold - route.remainingAmount) / route.threshold) * 100))
})
</script>

<template>
  <div
    v-if="progress"
    class="flex flex-col gap-2"
  >
    <p class="text-sm font-semibold text-highlighted">
      <template v-if="progress.free">
        {{ t('qualified') }}
      </template>
      <i18n-t
        v-else-if="progress.remainingAmount !== null"
        keypath="progress"
      >
        <template #amount>
          <span class="font-mono">{{ n(progress.remainingAmount, 'currency') }}</span>
        </template>
      </i18n-t>
      <template v-else-if="progress.remainingQuantity !== null">
        {{ t('progress_quantity', { count: progress.remainingQuantity }, progress.remainingQuantity) }}
      </template>
    </p>
    <UProgress
      v-if="meter !== null"
      :model-value="meter"
      :color="progress.free ? 'success' : 'secondary'"
      size="md"
      :ui="{ base: 'bg-elevated' }"
      :aria-label="t('meter')"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  progress: Σου λείπουν {amount} για δωρεάν μεταφορικά
  progress_quantity: 'Σου λείπει {count} τεμάχιο για δωρεάν μεταφορικά | Σου λείπουν {count} τεμάχια για δωρεάν μεταφορικά'
  qualified: Τα μεταφορικά σου είναι δωρεάν
  meter: Πρόοδος προς τα δωρεάν μεταφορικά
en:
  progress: You're {amount} away from free delivery
  progress_quantity: "You're {count} item away from free delivery | You're {count} items away from free delivery"
  qualified: Your delivery is free
  meter: Progress towards free delivery
</i18n>
