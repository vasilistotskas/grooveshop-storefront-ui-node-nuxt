<script lang="ts" setup>
import type { PropType } from 'vue'
import type { CartItem } from '~/types/cart/cart-item'

defineProps({
	items: { type: Array as PropType<CartItem[] | null>, required: true },
	shippingPrice: { type: Number, required: true },
	totalDiscountValue: { type: Number, required: true },
	totalItems: { type: Number, required: true },
	totalItemsUnique: { type: Number, required: true },
	totalPrice: { type: Number, required: true },
	totalVatValue: { type: Number, required: true }
})

defineSlots<{
	'pay-ways'(props: {}): any
	items(props: {}): any
	button(props: {}): any
}>()
</script>

<template>
	<div class="sidebar grid gap-2 md:gap-4 relative">
		<slot name="pay-ways"></slot>
		<slot name="items"></slot>
		<div class="sidebar-container">
			<div class="sidebar-title hidden">
				<h3 class="text-primary-700 dark:text-primary-100">
					{{ $t('components.checkout.sidebar.title') }}
				</h3>
			</div>
			<div class="sidebar-list">
				<div class="sidebar-list-item">
					<div class="sidebar-list-item-title">
						<span class="text-primary-700 dark:text-primary-100">
							{{ $t('components.checkout.sidebar.items_unique') }}:
						</span>
					</div>
					<div class="sidebar-list-item-value">
						<span class="text-primary-700 dark:text-primary-100 font-bold">
							{{ totalItemsUnique }}
						</span>
					</div>
				</div>
				<div class="sidebar-list-item">
					<div class="sidebar-list-item-title">
						<span class="text-primary-700 dark:text-primary-100">
							{{ $t('components.checkout.sidebar.shipping') }}:
						</span>
					</div>
					<div class="sidebar-list-item-value">
						<span class="text-primary-700 dark:text-primary-100 font-bold"
							>{{ shippingPrice }}€
						</span>
					</div>
				</div>
				<div class="sidebar-list-item">
					<div class="sidebar-list-item-title">
						<span class="text-primary-700 dark:text-primary-100">
							{{ $t('components.checkout.sidebar.discount') }}:
						</span>
					</div>
					<div class="sidebar-list-item-value">
						<span class="text-primary-700 dark:text-primary-100 font-bold"
							>{{ totalDiscountValue }}€</span
						>
					</div>
				</div>
				<div class="sidebar-list-item">
					<div class="sidebar-list-item-title">
						<span class="text-primary-700 dark:text-primary-100">
							{{ $t('components.checkout.sidebar.vat') }}:
						</span>
					</div>
					<div class="sidebar-list-item-value">
						<span class="text-primary-700 dark:text-primary-100 font-bold"
							>{{ totalVatValue }}€</span
						>
					</div>
				</div>
				<div class="sidebar-list-item">
					<div class="sidebar-list-item-title">
						<span class="text-primary-700 dark:text-primary-100">
							{{ $t('components.checkout.sidebar.total') }}:
						</span>
					</div>
					<div class="sidebar-list-item-value">
						<span class="text-primary-700 dark:text-primary-100 font-bold"
							>{{ totalPrice }}€</span
						>
					</div>
				</div>
			</div>
		</div>
		<slot name="button"></slot>
	</div>
</template>

<style lang="scss" scoped>
.sidebar {
	grid-template-rows: auto auto auto;

	&-list {
		&-item {
			display: flex;
			gap: 5px;
		}
	}
}
</style>
