<script lang="ts" setup>
import type { PropType } from 'vue'

import type { Index } from '~/types/product'

const props = defineProps({
  product: { type: Object as PropType<Index>, required: true },
  quantity: { type: Number, required: true, default: 1 },
  text: {
    type: String,
    required: true,
  },
})

const cartStore = useCartStore()
const { refreshCart, createCartItem } = cartStore

const { product, quantity } = toRefs(props)
const { t } = useI18n()
const toast = useToast()

const addToCartEvent = async () => {
  await createCartItem({
    product: product.value,
    quantity: quantity.value,
  })
  await refreshCart()
  toast.add({
    title: t('components.add_to_cart_button.added_to_cart'),
    color: 'green',
  })
}
</script>

<template>
  <UButton
    class="
      ml-0 justify-center

      sm:ml-4
    "
    icon="i-heroicons-shopping-cart"
    :label="text"
    size="xl"
    :trailing="true"
    color="primary"
    variant="soft"
    @click.prevent="addToCartEvent"
  />
</template>
