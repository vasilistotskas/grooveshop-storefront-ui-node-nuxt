<script lang="ts" setup>
import emptyIcon from '~icons/mdi/package-variant-remove'

const cartStore = useCartStore()
const { cart, pending } = storeToRefs(cartStore)

const config = useRuntimeConfig()
const { t, locale } = useLang()
const breadcrumbUi = useBreadcrumbsUi()

const items = defineBreadcrumbItems([
	{
		to: '/',
		ariaLabel: t('seoUi.breadcrumb.items.index.ariaLabel'),
		icon: 'material-symbols:home-outline-rounded'
	},
	{
		to: locale.value === config.public.defaultLocale ? '/cart' : `/${locale.value}/cart`,
		label: t('seoUi.breadcrumb.items.cart.label'),
		current: true
	}
])

definePageMeta({
	layout: 'page'
})
</script>

<template>
	<PageWrapper class="container grid gap-4 grid-rows-auto-1fr">
		<SBreadcrumb id="sub" :items="items" :ui="breadcrumbUi" />
		<PageBody>
			<ClientOnly>
				<template v-if="!pending.cart && cart?.cartItems?.length">
					<div class="grid md:grid-rows-repeat-auto-fill-mimax-100-130 gap-4">
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
				<template #fallback>
					<ClientOnlyFallback width="100%" height="320px" />
				</template>
			</ClientOnly>
		</PageBody>
		<div class="grid items-center">
			<h2 class="grid justify-items-center justify-self-end">
				<MainButton
					:text="$t('pages.cart.checkout')"
					:type="'link'"
					class="font-extrabold capitalize"
					:to="'checkout'"
				/>
			</h2>
		</div>
	</PageWrapper>
</template>
