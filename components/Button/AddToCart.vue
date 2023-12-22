<script lang="ts" setup>
import type { PropType } from 'vue'
import type { Product } from '~/types/product/product'

const props = defineProps({
	product: { type: Object as PropType<Product>, required: true },
	quantity: { type: Number, required: true, default: 1 },
	text: {
		type: String,
		required: true
	}
})

const cartStore = useCartStore()
const { fetchCart, addCartItem } = cartStore

const { product, quantity, text } = toRefs(props)
const { t } = useI18n()
const toast = useToast()

const refreshCart = async () => await fetchCart()

const addToCartEvent = async () => {
	await addCartItem({
		product: product.value,
		quantity: quantity.value
	})
	await refreshCart()
	toast.add({
		title: t('components.add_to_cart_button.added_to_cart')
	})
}
</script>

<template>
	<MainButton
		class="w-full md:w-auto"
		type="button"
		size="lg"
		:text="text"
		@click.prevent="addToCartEvent"
	/>
</template>
