<script lang="ts" setup>
import type { PropType } from 'vue'
import type { ButtonProps } from '#ui/types'

const cartStore = useCartStore()
const { getCartTotalItems, hasStockIssues, pending } = storeToRefs(cartStore)
const { t } = useStoreI18n('components/variants/webside/Cart/CartButton')
const localePath = useLocalePath()

defineProps({
  size: {
    type: String as PropType<ButtonProps['size']>,
    default: 'xl',
  },
})

// The count in the accent, as webside's board draws it, in the accent's own
// text colour: white reads at 6.5:1 on the light accent and 4.7:1 on the
// dark one, where white on the green read at 3.2:1 (Nuxt UI pairs a fill
// with the inverted text, near-black in the dark scheme: 3.7:1).
const color = computed(() => {
  if (hasStockIssues.value) return 'warning'
  return 'secondary'
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
    :ui="color === 'secondary' ? { base: 'text-(--ui-on-secondary)' } : undefined"
  >
    <!-- A 24px icon, a 44px target below `lg` (WCAG 2.5.5): the hit area
         reaches 10px around it, so the icon and its count stay put. -->
    <UButton
      class="
        relative p-0
        max-lg:after:absolute max-lg:after:-inset-2.5
      "
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
