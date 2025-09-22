<script lang="ts" setup>
import type { PropType } from 'vue'
import type { ButtonProps } from '@nuxt/ui'

const cartStore = useCartStore()
const { getCartTotalItems, pending } = storeToRefs(cartStore)
const { t } = useI18n()
const localePath = useLocalePath()

defineProps({
  size: {
    type: String as PropType<ButtonProps['size']>,
    default: 'xl',
  },
  color: {
    type: String as PropType<ButtonProps['color']>,
    default: 'success',
  },
})
</script>

<template>
  <UChip
    :size="'3xl'"
    :color="color"
    :show="!pending"
    :text="getCartTotalItems"
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
        base: 'cursor-pointer hover:bg-transparent',
      }"
    />
  </UChip>
</template>

<i18n lang="yaml">
el:
  cart: Καλάθι
</i18n>
