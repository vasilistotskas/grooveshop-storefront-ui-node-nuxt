<script lang="ts" setup>
/**
 * What the cart page says above its lines: that free delivery has been
 * reached — or, until it is, how far the cart is from it — and, for each
 * offer the cart is just short of, what it would take to unlock: a few
 * euros more, a few more items (a minimum quantity, or the rest of a
 * "2+1" group), or one of the products an offer rewards ("a case bought,
 * its screen protector at -50%"), linked so the shopper can add it.
 *
 * Django sends a teaser only after checking that doing what it says gets
 * the offer granted, so every line here is a promise the cart keeps.
 *
 * The delivery threshold is the store's cheapest free-delivery carrier
 * (`useFreeShippingInfo`), so no carrier is named: the shopper picks one
 * in checkout.
 */
const props = defineProps<{
  /** The cart's `freeThresholdValue`, which delivery turns free on. */
  cartTotal: number
  /** The value at which delivery turns free; 0 when the store has none. */
  threshold: number
  nearMisses: Cart['promotionNearMiss']
}>()

const { t, n } = useI18n()

/** Reward products shown per teaser; the banner is a nudge, not a listing. */
const REWARD_CHIP_LIMIT = 3

const qualified = computed(() => props.threshold > 0 && props.cartTotal >= props.threshold)
</script>

<template>
  <div class="flex flex-col gap-3">
    <UAlert
      v-if="qualified"
      color="success"
      variant="soft"
      icon="i-lucide-truck"
      :title="t('unlocked_title')"
      :description="t('unlocked_description', { threshold: n(threshold, 'currency') })"
    />
    <ShippingFreeShippingNotice v-else />

    <div
      v-for="miss in nearMisses"
      :key="`miss-${miss.promotionId}`"
      class="
        flex items-center gap-3 rounded-xl bg-volt px-4 py-3 text-sm
        font-medium text-on-volt
      "
    >
      <UIcon
        name="i-lucide-sparkles"
        class="size-4 shrink-0"
        aria-hidden="true"
      />
      <div class="flex min-w-0 flex-col gap-2">
        <p v-if="miss.rewardProducts.length">
          {{ t('near_miss_reward', { name: miss.name }, miss.rewardProducts.length) }}
        </p>
        <p v-else-if="miss.remainingQuantity !== null">
          {{ t('near_miss_quantity', { count: miss.remainingQuantity, name: miss.name }, miss.remainingQuantity) }}
        </p>
        <p v-else-if="miss.remainingAmount !== null">
          {{ t('near_miss', { amount: n(miss.remainingAmount, 'currency'), name: miss.name }) }}
        </p>
        <ul
          v-if="miss.rewardProducts.length"
          class="flex flex-wrap gap-x-4 gap-y-2"
        >
          <li
            v-for="product in miss.rewardProducts.slice(0, REWARD_CHIP_LIMIT)"
            :key="`reward-${miss.promotionId}-${product.id}`"
            class="min-w-0"
          >
            <OffersProductChip :product="product" named />
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  unlocked_title: Δωρεάν μεταφορικά
  unlocked_description: Η παραγγελία σου ξεπερνά τα {threshold}, άρα τα μεταφορικά είναι δικά μας.
  near_miss: Πρόσθεσε {amount} ακόμη και κέρδισε «{name}»
  near_miss_quantity: 'Πρόσθεσε {count} ακόμη τεμάχιο και κέρδισε «{name}» | Πρόσθεσε {count} ακόμη τεμάχια και κέρδισε «{name}»'
  near_miss_reward: 'Πρόσθεσε αυτό και κέρδισε «{name}» | Πρόσθεσε ένα από αυτά και κέρδισε «{name}»'
en:
  unlocked_title: Free delivery unlocked
  unlocked_description: Your order is over {threshold}, so delivery is on us.
  near_miss: Add {amount} more and get {name}
  near_miss_quantity: 'Add {count} more item and get {name} | Add {count} more items and get {name}'
  near_miss_reward: 'Add this and get {name} | Add one of these and get {name}'
</i18n>
