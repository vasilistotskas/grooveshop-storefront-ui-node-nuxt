<script lang="ts" setup>
import type { PropType } from 'vue'
import type { ButtonProps } from '#ui/types'

defineProps({
  size: {
    type: String as PropType<ButtonProps['size']>,
    default: 'xl',
  },
  color: {
    type: String as PropType<ButtonProps['color']>,
    default: 'success',
  },
  cartTotalItems: {
    type: Number,
    default: 3,
  },
  pending: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <UChip
    :size="size"
    :color="color"
    :show="!pending"
    :text="cartTotalItems"
  >
    <UButton
      class="p-0"
      icon="i-heroicons-shopping-cart"
      :size="size"
      color="neutral"
      variant="ghost"
      aria-label="cart"
      title="cart"
      to="cart"
      :ui="{
        base: 'cursor-pointer hover:bg-transparent',
      }"
    />
  </UChip>
</template>
