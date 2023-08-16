<script lang="ts" setup>
import { PropType } from 'vue'
import { Product } from '~/types/product/product'
import { GlobalEvents } from '~/events/global'

const props = defineProps({
	product: { type: Object as PropType<Product>, required: true },
	quantity: { type: Number, required: true, default: 1 },
	text: {
		type: String,
		required: true
	}
})

const { t } = useLang()
const store = useCartStore()
const toast = useToast()

const cartBus = useEventBus<string>(GlobalEvents.ON_CART_UPDATED)
</script>

<template>
	<Button
		class="w-full md:w-auto"
		type="button"
		size="lg"
		:text="text"
		@click.prevent="
			store
				.addCartItem({
					product: String(product.id),
					quantity: String(quantity)
				})
				.then(() => {
					toast.success(t('components.add_to_cart_button.added_to_cart'))
					cartBus.emit(GlobalEvents.ON_CART_UPDATED)
				})
				.catch((err) => {
					toast.error(err.message)
				})
		"
	/>
</template>
