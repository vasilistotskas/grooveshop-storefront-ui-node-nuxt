<script lang="ts" setup>
import { PropType } from 'vue'
import { CartItem } from '~/types/cart/cart-item'
import { GlobalEvents } from '~/events/global'

const props = defineProps({
	cartItem: { type: Object as PropType<CartItem>, required: true }
})

const { cartItem } = toRefs(props)
const { extractTranslated } = useTranslationExtractor()

const { locale } = useLang()
const { contentShorten } = useText()
const { resolveImageFilenameNoExt, resolveImageFileExtension, resolveImageSrc } =
	useImageResolver()

const imageExtension = computed(() => {
	return resolveImageFileExtension(cartItem.value.product.mainImageFilename)
})

const imageSrc = computed(() => {
	return resolveImageSrc(
		cartItem.value.product.mainImageFilename,
		`media/uploads/products/${resolveImageFilenameNoExt(
			cartItem.value.product.mainImageFilename
		)}`
	)
})

const bus = useEventBus<string>(GlobalEvents.CART_QUANTITY_SELECTOR)
const cartItemQuantity = useState<number>(
	`${cartItem.value.id}-quantity`,
	() => cartItem.value.quantity || 0
)
</script>

<template>
	<div
		v-if="cartItem"
		class="grid grid-cols-6 items-center gap-4 py-4 bg-white dark:bg-slate-800 border rounded-md border-gray-900/10 dark:border-gray-50/[0.2]"
	>
		<div class="image">
			<Anchor
				:to="`/product${cartItem.product.absoluteUrl}`"
				:title="extractTranslated(cartItem.product, 'name', locale)"
			>
				<NuxtImg
					preload
					placeholder
					loading="lazy"
					provider="mediaStream"
					class="product-img"
					:style="{ objectFit: 'contain' }"
					:width="237"
					:height="90"
					:fit="'contain'"
					:position="'entropy'"
					:background="'transparent'"
					:trim-threshold="5"
					:format="imageExtension"
					sizes="sm:100vw md:50vw lg:237px"
					:src="imageSrc"
					:alt="extractTranslated(cartItem.product, 'name', locale)"
				/>
			</Anchor>
		</div>
		<div class="title">
			<h3 class="text-gray-700 dark:text-gray-200">
				<Anchor
					:to="`/product${cartItem.product.absoluteUrl}`"
					:title="extractTranslated(cartItem.product, 'name', locale)"
					>{{
						contentShorten(extractTranslated(cartItem.product, 'name', locale), 50)
					}}</Anchor
				>
			</h3>
		</div>
		<div class="quantity">
			<QuantitySelector
				:quantity="cartItemQuantity"
				:max="cartItem.product.stock"
				:cart-item-id="cartItem.id"
			/>
		</div>
		<div class="price">
			<span class="text-gray-700 dark:text-gray-200">{{
				cartItem.product.finalPrice
			}}</span>
		</div>
		<div class="total-price">
			<span class="text-gray-700 dark:text-gray-200">{{ cartItem.totalPrice }}</span>
		</div>
		<div class="remove-from-cart">
			<button
				class="text-gray-700 dark:text-gray-200"
				:title="
					$t('components.cart.item_card.remove_from_cart', {
						name: extractTranslated(cartItem.product, 'name', locale)
					})
				"
				type="button"
				@click="bus.emit('delete', { cartItemId: cartItem.id })"
			>
				<IconFaSolid:trash />
			</button>
		</div>
	</div>
</template>
