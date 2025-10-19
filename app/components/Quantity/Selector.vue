<script lang="ts" setup>
const props = defineProps({
  max: { type: Number, required: false, default: 1 },
  cartItemId: { type: Number, required: true },
})

const toast = useToast()
const cartStore = useCartStore()
const { updateCartItem } = cartStore
const { error } = storeToRefs(cartStore)
const { max, cartItemId } = toRefs(props)

const cartItemQuantity = useState<number>(`${cartItemId.value}-quantity`)

const decreaseQuantityEvent = async () => {
  if (cartItemQuantity.value <= 1) return
  cartItemQuantity.value -= 1
  await updateCartItem(props.cartItemId, {
    quantity: cartItemQuantity.value,
  })
}

const increaseQuantityEvent = async () => {
  if (cartItemQuantity.value >= props.max) return
  cartItemQuantity.value += 1
  await updateCartItem(props.cartItemId, {
    quantity: cartItemQuantity.value,
  })
}

const changeQuantityEvent = async () => {
  const value = cartItemQuantity.value
  if (value < 1 || value > props.max) return
  try {
    await updateCartItem(props.cartItemId, {
      quantity: value,
    })
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
}

const quantityItems = computed(() => {
  return Array.from({ length: max.value }, (_, i) => ({
    label: String(i + 1),
    value: i + 1,
  }))
})
</script>

<template>
  <div class="flex w-full items-center gap-2">
    <UButton
      color="neutral"
      variant="outline"
      icon="i-fa-solid-minus"
      size="sm"
      :disabled="cartItemQuantity <= 1"
      square
      class="flex-shrink-0"
      @click="decreaseQuantityEvent"
    />

    <USelect
      v-model="cartItemQuantity"
      :items="quantityItems"
      color="neutral"
      size="sm"
      variant="outline"
      class="min-w-[4rem] flex-1 text-center"
      @change="changeQuantityEvent"
    />

    <UButton
      color="neutral"
      variant="outline"
      icon="i-fa-solid-plus"
      size="sm"
      :disabled="cartItemQuantity >= max"
      square
      class="flex-shrink-0"
      @click="increaseQuantityEvent"
    />
  </div>
</template>
