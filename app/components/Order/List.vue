<script lang="ts" setup>
import type { PropType } from 'vue'

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

const emit = defineEmits<{
  cancelled: [orderId: number]
}>()

const { t } = useI18n()
</script>

<template>
  <div class="grid w-full items-start gap-4">
    <div
      v-if="displayTotal"
      class="flex items-center justify-center gap-1"
    >
      <span
        class="text-sm font-semibold"
      >
        {{ t('total', ordersTotal) }}
      </span>
    </div>
    <ol
      class="
        grid gap-2
        md:grid-cols-2 md:gap-4
      "
    >
      <OrderCard
        v-for="order in orders"
        :key="order.id"
        :order="order"
        @cancelled="(id) => emit('cancelled', id)"
      />
    </ol>
  </div>
</template>

<i18n lang="yaml">
el:
  total: Χωρίς παραγγελίες | 1 Παραγγελία | {count} Παραγγελίες
</i18n>
