<script lang="ts" setup>
const props = defineProps({
	max: { type: Number, required: true, default: 1 },
	cartItemId: { type: Number, required: true }
})

const { max, cartItemId } = toRefs(props)
const cartStore = useCartStore()

const cartItemQuantity = useState<number>(`${cartItemId.value}-quantity`)
const refreshCart = async () => await cartStore.fetchCart()

const decreaseQuantityEvent = async () => {
	if (cartItemQuantity.value <= 1) return
	cartItemQuantity.value -= 1
	await cartStore.updateCartItem(props.cartItemId, {
		quantity: String(cartItemQuantity.value)
	})
	await refreshCart()
}
const increaseQuantityEvent = async () => {
	if (cartItemQuantity.value >= props.max) return
	cartItemQuantity.value += 1
	await cartStore.updateCartItem(props.cartItemId, {
		quantity: String(cartItemQuantity.value)
	})
	await refreshCart()
}
const changeQuantityEvent = async (event: Event) => {
	if (!(event.target instanceof HTMLSelectElement)) return
	const value = parseInt(event.target.value)
	await cartStore.updateCartItem(props.cartItemId, {
		quantity: String(value)
	})
	await refreshCart()
}
</script>

<template>
	<div
		class="quantity-selector grid grid-cols-3 items-center justify-center justify-items-center"
	>
		<button
			class="text-gray-700 dark:text-gray-200"
			:disabled="cartItemQuantity <= 1"
			:aria-label="'decrease'"
			type="button"
			@click="decreaseQuantityEvent"
		>
			<IconFaSolid:minus />
		</button>
		<select
			class="w-full text-gray-700 dark:text-gray-200 bg-gray-100/[0.8] dark:bg-slate-800/[0.8] border border-gray-200"
			:value="cartItemQuantity"
			:aria-label="'quantity'"
			@change="changeQuantityEvent"
		>
			<option v-for="i in max" :key="i" :value="i" :selected="i === cartItemQuantity">
				{{ i }}
			</option>
		</select>

		<button
			class="text-gray-700 dark:text-gray-200"
			:disabled="cartItemQuantity >= max"
			:aria-label="'increase'"
			type="button"
			@click="increaseQuantityEvent"
		>
			<IconFaSolid:plus />
		</button>
	</div>
</template>
