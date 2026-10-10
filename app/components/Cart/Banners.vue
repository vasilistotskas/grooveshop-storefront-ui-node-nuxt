<script lang="ts" setup>
/**
 * What the cart page says above its lines: that free delivery has been
 * reached — or, until it is, how far the cart is from it — and, for each
 * offer the cart is just short of, what it would take to unlock: a few
 * euros more, or a few more items (a minimum quantity, or the rest of a
 * "2+1" group).
 *
 * The delivery threshold is the store's cheapest free-delivery carrier
 * (`useFreeShippingInfo`), so no carrier is named: the shopper picks one
 * in checkout.
 */
const props = defineProps<{
  cartTotal: number
  /** The subtotal at which delivery turns free; 0 when the store has none. */
  threshold: number
  nearMisses: Cart['promotionNearMiss']
}>()

const { t, n } = useI18n()

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
    <ShippingFreeShippingNotice
      v-else
      :cart-total="cartTotal"
    />

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
      <p v-if="miss.remainingQuantity !== null">
        {{ t('near_miss_quantity', { count: miss.remainingQuantity, name: miss.name }, miss.remainingQuantity) }}
      </p>
      <p v-else-if="miss.remainingAmount !== null">
        {{ t('near_miss', { amount: n(miss.remainingAmount, 'currency'), name: miss.name }) }}
      </p>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  unlocked_title: Δωρεάν μεταφορικά
  unlocked_description: Η παραγγελία σου ξεπερνά τα {threshold}, άρα τα μεταφορικά είναι δικά μας.
  near_miss: Πρόσθεσε {amount} ακόμη και κέρδισε «{name}»
  near_miss_quantity: 'Πρόσθεσε {count} ακόμη τεμάχιο και κέρδισε «{name}» | Πρόσθεσε {count} ακόμη τεμάχια και κέρδισε «{name}»'
en:
  unlocked_title: Free delivery unlocked
  unlocked_description: Your order is over {threshold}, so delivery is on us.
  near_miss: Add {amount} more and get {name}
  near_miss_quantity: 'Add {count} more item and get {name} | Add {count} more items and get {name}'
</i18n>
