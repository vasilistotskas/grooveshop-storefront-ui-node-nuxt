<script lang="ts" setup>
import type { PropType } from 'vue'

import type { Order } from '~/types/order/order'

defineProps({
  orders: {
    type: Array as PropType<Order[] | null>,
    required: true,
  },
  ordersTotal: {
    type: Number,
    required: false,
    default: 0,
  },
  displayTotal: {
    type: Boolean,
    required: false,
    default: true,
  },
})
</script>

<template>
  <div class="grid w-full items-start gap-4">
    <div v-if="displayTotal" class="flex items-center justify-center gap-1">
      <span
        class="text-sm font-semibold text-secondary dark:text-secondary-dark"
      >
        {{ $t('pages.account.orders.total', ordersTotal) }}
      </span>
    </div>
    <ol class="grid gap-2 md:gap-4">
      <OrderCard v-for="order in orders" :key="order.id" :order="order" />
    </ol>
  </div>
</template>
