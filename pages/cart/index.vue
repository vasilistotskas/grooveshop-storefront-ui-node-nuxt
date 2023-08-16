<script lang="ts" setup>
import { GlobalEvents } from '~/events/global'
import emptyIcon from '~icons/mdi/package-variant-remove'

const { t } = useLang()
const config = useRuntimeConfig()
const store = useCartStore()
const toast = useToast()
const cartBus = useEventBus<string>(GlobalEvents.ON_CART_UPDATED)

const { cart, error, pending } = storeToRefs(store)

definePageMeta({
	layout: 'page'
})
useHead(() => ({
	title: t('pages.cart.title'),
	meta: [
		{
			name: 'description',
			content: t('pages.cart.description')
		},
		{
			name: 'keywords',
			content: t('pages.cart.keywords')
		}
	]
}))
useServerSeoMeta({
	title: t('pages.cart.title'),
	description: t('pages.cart.description')
})

const querySelectorBus = useEventBus<string>(GlobalEvents.CART_QUANTITY_SELECTOR)

querySelectorBus.on((event, payload: { cartItemId: number; quantity: number }) => {
	switch (event) {
		case 'update':
			store
				.updateCartItem(payload.cartItemId, {
					quantity: String(payload.quantity)
				})
				.then(() => {
					toast.success(t('pages.cart.updated'))
					cartBus.emit(GlobalEvents.ON_CART_UPDATED)
				})
				.catch((err) => {
					toast.error(err.message)
				})
			break
		case 'delete':
			store
				.deleteCartItem(payload.cartItemId)
				.then(() => {
					toast.success(t('pages.cart.deleted'))
					cartBus.emit(GlobalEvents.ON_CART_UPDATED)
				})
				.catch((err) => {
					toast.error(err.message)
				})
			break
	}
})
</script>

<template>
	<PageWrapper class="container grid gap-4 grid-rows-auto-1fr mt-4">
		<div class="grid grid-cols-2 items-center">
			<PageTitle :text="$t('pages.cart.title')" class="capitalize" />
			<h2 class="grid justify-items-center justify-self-end">
				<Button
					:text="$t('pages.cart.checkout')"
					:type="'link'"
					class="font-extrabold capitalize"
					:to="'checkout'"
				/>
			</h2>
		</div>
		<PageBody>
			<Error v-if="error.cart" :code="error.cart.statusCode" :error="error.cart" />
			<LoadingSkeleton
				v-if="pending.cart"
				:card-height="'130px'"
				:class="
					pending.cart ? 'grid grid-rows-repeat-auto-fill-mimax-100-130 gap-4' : 'hidden'
				"
				:loading="pending.cart"
				:direction="'row'"
				:columns-md="1"
				:columns-lg="1"
				:card-body-paragraphs="5"
				:replicas="cart?.cartItems.length || 4"
			></LoadingSkeleton>
			<template v-if="!pending.cart && cart?.cartItems.length">
				<div class="grid grid-rows-repeat-auto-fill-mimax-100-130 gap-4">
					<CartItemCard
						v-for="(cartItem, index) in cart.cartItems"
						:key="index"
						:cart-item="cartItem"
					/>
				</div>
			</template>
			<template v-if="!pending.cart && !cart?.cartItems.length">
				<EmptyState :icon="emptyIcon">
					<template #actions>
						<Button
							:text="$t('common.empty.button')"
							:type="'link'"
							:to="'index'"
						></Button>
					</template>
				</EmptyState>
			</template>
		</PageBody>
	</PageWrapper>
</template>
