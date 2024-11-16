<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  product: { type: Object as PropType<Product>, required: true },
  quantity: { type: Number, required: true, default: 1 },
  text: {
    type: String,
    required: true,
  },
})

const cartStore = useCartStore()
const { refreshCart, createCartItem } = cartStore

const { product, quantity } = toRefs(props)
const { t } = useI18n({ useScope: 'local' })
const toast = useToast()

const addToCartEvent = async () => {
  await createCartItem({
    product: product.value,
    quantity: quantity.value,
  })
  await refreshCart()
  toast.add({
    title: t('added_to_cart'),
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

<i18n lang="yaml">
el:
  added_to_cart: Προστέθηκε στο καλάθι
</i18n>
