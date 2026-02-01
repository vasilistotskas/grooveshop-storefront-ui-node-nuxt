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
const { createCartItem, updateCartItem, getCartItemByProductId } = cartStore
const { error, getCartTotalItems } = storeToRefs(cartStore)
const { product, quantity, text } = toRefs(props)
const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()

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
  const wasCartEmpty = getCartTotalItems.value === 0

  try {
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
  }
  catch {
    //
  }

  if (error.value?.data.data.nonFieldErrors && error.value?.data.data.nonFieldErrors.length > 0) {
    error.value?.data.data.nonFieldErrors.forEach((error: string) => {
      toast.add({
        title: error,
        color: 'error',
      })
    })
  }
  else {
    // Navigate to checkout if cart was empty before adding this item
    if (wasCartEmpty && getCartTotalItems.value > 0) {
      await navigateTo(localePath('checkout'))
    }
  }
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
    :aria-label="disabled ? t('unavailable') : text"
    :ui="{
      base: 'w-full place-content-center place-items-center',
    }"
    @click.prevent="addToCartEvent"
  />
</template>

<i18n lang="yaml">
el:
  unavailable: Μή Διαθέσιμο
</i18n>
