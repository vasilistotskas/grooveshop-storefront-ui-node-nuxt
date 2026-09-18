<script lang="ts" setup>
import type { PropType } from 'vue'
import type { ButtonProps } from '#ui/types'

const cartStore = useCartStore()
const { getCartTotalItems, hasStockIssues, pending } = storeToRefs(cartStore)
const { t } = useI18n()
const localePath = useLocalePath()

defineProps({
  size: {
    type: String as PropType<ButtonProps['size']>,
    default: 'xl',
  },
})

const color = computed(() => {
  if (hasStockIssues.value) return 'warning'
  return 'success'
})

// Cap the badge at "99+" so a runaway count (returning customer with a
// big saved cart, or a synced multi-session cart) doesn't overflow the
// UChip and distort the cart-icon tap target.
const displayCount = computed<string | number>(() => {
  const n = Number(getCartTotalItems.value) || 0
  return n > 99 ? '99+' : n
})
</script>

<template>
  <UChip
    :size="'3xl'"
    :color="color"
    :show="!pending"
    :text="displayCount"
  >
    <UButton
      class="p-0"
      icon="i-heroicons-shopping-cart"
      :size="size"
      color="neutral"
      variant="ghost"
      :aria-label="t('cart')"
      :title="t('cart')"
      :to="localePath('cart')"
      :ui="{
        base: `
          cursor-pointer
          hover:bg-transparent
        `,
      }"
    />
  </UChip>
</template>

<i18n lang="yaml">
el:
  cart: Καλάθι
</i18n>
