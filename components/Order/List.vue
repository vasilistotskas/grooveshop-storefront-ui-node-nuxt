<script lang="ts" setup>
import type { PropType } from 'vue'

import type { Order } from '~/types/order/order'

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
  <div class="grid w-full items-start">
    <slot class="header" />
    <slot>
      <div class="grid gap-4">
        <OrderCard v-for="order in orders" :key="order.id" :order="order" />
      </div>
    </slot>
    <slot class="footer" />
  </div>
</template>
