<script lang="ts" setup>
const props = defineProps({
  max: { type: Number, required: false, default: 1 },
  cartItemId: { type: Number, required: true },
})

const toast = useToast()
const cartStore = useCartStore()
const { updateCartItem } = cartStore
const { cart, error } = storeToRefs(cartStore)

const cartItemQuantity = computed(() => {
  const item = cart.value?.items?.find(i => i.id === props.cartItemId)
  return item?.quantity ?? 0
})

const isUpdating = ref(false)

const onQuantityChange = async (value: number) => {
  if (isUpdating.value) return
  if (value < 1 || value > props.max) return
  isUpdating.value = true
  try {
    await updateCartItem(props.cartItemId, {
      quantity: value,
    })
  }
  catch (err) {
    log.error({ action: 'cart:updateQuantity', error: err })
  }
  finally {
    isUpdating.value = false
  }

  const errorData = error.value?.data?.data as Record<string, unknown> | undefined
  const nonFieldErrors = errorData?.nonFieldErrors as string[] | undefined
  if (nonFieldErrors && nonFieldErrors.length > 0) {
    nonFieldErrors.forEach((error: string) => {
      toast.add({
        title: error,
        color: 'error',
      })
    })
  }
}
</script>

<template>
  <UInputNumber
    :model-value="cartItemQuantity"
    :min="1"
    :max="max"
    :step="1"
    color="neutral"
    size="sm"
    variant="outline"
    :disabled="isUpdating"
    @update:model-value="onQuantityChange"
  />
</template>
