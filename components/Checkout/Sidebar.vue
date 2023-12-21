<script lang="ts" setup>
defineProps({
	shippingPrice: { type: Number, required: true }
})

const cartStore = useCartStore()
const { cart, getCartItems } = storeToRefs(cartStore)

defineSlots<{
	'pay-ways'(props: {}): any
	items(props: {}): any
	button(props: {}): any
}>()
</script>

<template>
	<div class="grid gap-2 md:gap-4 relative grid-rows-auto">
		<slot name="pay-ways"></slot>
		<slot name="items"></slot>
		<ClientOnly>
			<div class="grid">
				<div class="hidden">
					<h3 class="text-primary-700 dark:text-primary-100">
						{{ $t('components.checkout.sidebar.title') }}
					</h3>
				</div>
				<div v-if="cart && getCartItems?.length">
					<div class="flex gap-1">
						<div class="grid">
							<span class="text-primary-700 dark:text-primary-100">
								{{ $t('components.checkout.sidebar.items_unique') }}:
							</span>
						</div>
						<div class="grid">
							<span class="text-primary-700 dark:text-primary-100 font-bold">
								{{ cart.totalItemsUnique }}
							</span>
						</div>
					</div>
					<div class="flex gap-1">
						<div class="grid">
							<span class="text-primary-700 dark:text-primary-100">
								{{ $t('components.checkout.sidebar.shipping') }}:
							</span>
						</div>
						<div class="grid">
							<span class="text-primary-700 dark:text-primary-100 font-bold"
								>{{ shippingPrice }}€
							</span>
						</div>
					</div>
					<div class="flex gap-1">
						<div class="grid">
							<span class="text-primary-700 dark:text-primary-100">
								{{ $t('components.checkout.sidebar.discount') }}:
							</span>
						</div>
						<div class="grid">
							<span class="text-primary-700 dark:text-primary-100 font-bold"
								>{{ cart.totalDiscountValue }}€</span
							>
						</div>
					</div>
					<div class="flex gap-1">
						<div class="grid">
							<span class="text-primary-700 dark:text-primary-100">
								{{ $t('components.checkout.sidebar.vat') }}:
							</span>
						</div>
						<div class="grid">
							<span class="text-primary-700 dark:text-primary-100 font-bold"
								>{{ cart.totalVatValue }}€</span
							>
						</div>
					</div>
					<div class="flex gap-1">
						<div class="grid">
							<span class="text-primary-700 dark:text-primary-100">
								{{ $t('components.checkout.sidebar.total') }}:
							</span>
						</div>
						<div class="grid">
							<span class="text-primary-700 dark:text-primary-100 font-bold"
								>{{ cart.totalPrice }}€</span
							>
						</div>
					</div>
				</div>
			</div>
			<template #fallback>
				<ClientOnlyFallback height="121px" width="416px" />
			</template>
		</ClientOnly>
		<slot name="button"></slot>
	</div>
</template>
