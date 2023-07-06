<script lang="ts" setup>
import { PropType } from 'vue'
import { Order } from '~/zod/order/order'

const props = defineProps({
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
const { t } = useLang()
</script>

<template>
	<div class="order__list">
		<slot class="header"></slot>
		<slot>
			<div class="order__list__body">
				<OrderCard v-for="order in orders" :key="order.id" :order="order" />
			</div>
		</slot>
		<slot class="footer"></slot>
	</div>
</template>

<style lang="scss" scoped>
.order__list {
	width: 100%;
	display: grid;
	align-items: start;
	&__body {
		display: grid;
		gap: 1rem;
	}
}
</style>
