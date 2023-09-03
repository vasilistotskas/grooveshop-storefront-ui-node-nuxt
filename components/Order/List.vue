<script lang="ts" setup>
import { PropType } from 'vue'
import { Order } from '~/types/order/order'

defineProps({
	orders: {
		type: Array as PropType<Order[] | null>,
		required: true
	}
})
defineSlots<{
	default(props: {}): any
	header(props: {}): any
	footer(props: {}): any
}>()
</script>

<template>
	<div class="order-list">
		<slot class="header"></slot>
		<slot>
			<div class="order-list-body">
				<OrderCard v-for="order in orders" :key="order.id" :order="order" />
			</div>
		</slot>
		<slot class="footer"></slot>
	</div>
</template>

<style lang="scss" scoped>
.order-list {
	width: 100%;
	display: grid;
	align-items: start;

	&-body {
		display: grid;
		gap: 1rem;
	}
}
</style>
