<script lang="ts" setup>
const props = defineProps({
  max: { type: Number, required: false, default: 1 },
  cartItemId: { type: Number, required: true },
})

const cartStore = useCartStore()
const { refreshCart, updateCartItem } = cartStore

const { max, cartItemId } = toRefs(props)

const cartItemQuantity = useState<number>(`${cartItemId.value}-quantity`)

const decreaseQuantityEvent = async () => {
  if (cartItemQuantity.value <= 1) return
  cartItemQuantity.value -= 1
  await updateCartItem(props.cartItemId, {
    quantity: String(cartItemQuantity.value),
  })
  await refreshCart()
}
const increaseQuantityEvent = async () => {
  if (cartItemQuantity.value >= props.max) return
  cartItemQuantity.value += 1
  await updateCartItem(props.cartItemId, {
    quantity: String(cartItemQuantity.value),
  })
  await refreshCart()
}
const changeQuantityEvent = async (event: Event) => {
  if (!(event.target instanceof HTMLSelectElement)) return
  const value = parseInt(event.target.value)
  if (value < 1 || value > props.max) return
  cartItemQuantity.value = value
  await updateCartItem(props.cartItemId, {
    quantity: String(value),
  })
  await refreshCart()
}
</script>

<template>
  <div
    class="
      quantity-selector grid grid-cols-3 items-center justify-center
      justify-items-center
    "
  >
    <button
      class="
        text-primary-950

        dark:text-primary-50
      "
      :disabled="cartItemQuantity <= 1"
      :aria-label="'decrease'"
      type="button"
      @click="decreaseQuantityEvent"
    >
      <UIcon name="i-fa-solid-minus" />
    </button>
    <select
      class="
        text-primary-950 bg-primary-100 border-primary-500 w-full border

        dark:text-primary-50 dark:bg-primary-900
      "
      :value="cartItemQuantity"
      :aria-label="'quantity'"
      @change="changeQuantityEvent"
    >
      <option
        v-for="i in max"
        :key="i"
        :value="i"
        :selected="i === cartItemQuantity"
      >
        {{ i }}
      </option>
    </select>

    <button
      class="
        text-primary-950

        dark:text-primary-50
      "
      :disabled="cartItemQuantity >= max"
      :aria-label="'increase'"
      type="button"
      @click="increaseQuantityEvent"
    >
      <UIcon name="i-fa-solid-plus" />
    </button>
  </div>
</template>
