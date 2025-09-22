<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  product: { type: Object as PropType<Product>, required: true },
  quantity: { type: Number, required: false, default: 1 },
  text: {
    type: String,
    required: true,
  },
})

const cartStore = useCartStore()
const { refreshCart, createCartItem, updateCartItem, getCartItemByProductId } = cartStore

const { product, quantity, text } = toRefs(props)
const { t } = useI18n()
const toast = useToast()

const cartItem = computed(() => {
  return getCartItemByProductId(product.value.id)
})
const disabled = computed(() => {
  if (product.value.active === false) {
    return true
  }
  if (product.value.stock === 0 || (product.value.stock && quantity.value > product.value.stock)) {
    return true
  }
  if (cartItem.value && cartItem.value.quantity && product.value.stock && cartItem.value.quantity + quantity.value > product.value.stock) {
    return true
  }
  return false
})
const label = computed(() => {
  if (disabled.value) {
    return t('unavailable')
  }
  return text.value
})

const addToCartEvent = async () => {
  const existingCartItem = getCartItemByProductId(product.value.id)

  if (existingCartItem) {
    await updateCartItem(existingCartItem.id, {
      quantity: (existingCartItem.quantity || 0) + quantity.value,
    })
  }
  else {
    await createCartItem({
      product: product.value.id,
      quantity: quantity.value,
    })
  }

  await refreshCart()
  toast.add({
    title: t('added_to_cart'),
    color: 'success',
  })
}
</script>

<template>
  <UButton
    icon="i-heroicons-shopping-cart"
    :label="label"
    size="xl"
    :trailing="true"
    :color="disabled ? 'warning' : 'success'"
    variant="subtle"
    :disabled="disabled"
    :ui="{
      base: 'w-full place-items-center place-content-center',
    }"
    @click.prevent="addToCartEvent"
  />
</template>

<i18n lang="yaml">
el:
  added_to_cart: Προστέθηκε στο καλάθι
  unavailable: Μή Διαθέσιμο
</i18n>
