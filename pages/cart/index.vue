<script lang="ts" setup>
import emptyIcon from '~icons/mdi/package-variant-remove'

const { t } = useLang()
const store = useCartStore()

const { cart, error, pending } = storeToRefs(store)

definePageMeta({
	layout: 'page'
})
useServerHead(() => ({
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
</script>

<template>
	<PageWrapper class="container grid gap-4 grid-rows-auto-1fr mt-4">
		<div class="grid grid-cols-2 items-center">
			<PageTitle :text="$t('pages.cart.title')" class="capitalize" />
			<h2 class="grid justify-items-center justify-self-end">
				<MainButton
					:text="$t('pages.cart.checkout')"
					:type="'link'"
					class="font-extrabold capitalize"
					:to="'checkout'"
				/>
			</h2>
		</div>
		<PageBody>
			<Error v-if="error.cart" :code="error.cart?.statusCode" :error="error.cart" />
			<template v-if="!pending.cart && cart?.cartItems?.length">
				<div class="grid grid-rows-repeat-auto-fill-mimax-100-130 gap-4">
					<CartItemCard
						v-for="(cartItem, index) in cart.cartItems"
						:key="index"
						:cart-item="cartItem"
					/>
				</div>
			</template>
			<template v-if="!pending.cart && !cart?.cartItems?.length">
				<EmptyState :icon="emptyIcon">
					<template #actions>
						<MainButton
							:text="$t('common.empty.button')"
							:type="'link'"
							:to="'index'"
						></MainButton>
					</template>
				</EmptyState>
			</template>
		</PageBody>
	</PageWrapper>
</template>
