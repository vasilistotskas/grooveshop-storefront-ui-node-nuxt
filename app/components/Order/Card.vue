<script lang="ts" setup>
import type { PropType } from 'vue'

import type { Order } from '~/types/order/order'

const props = defineProps({
  order: {
    type: Object as PropType<Order>,
    required: true,
  },
  maxItems: {
    type: Number,
    default: 2,
    required: false,
  },
})

const { order, maxItems } = toRefs(props)

const { locale } = useI18n()
const { contentShorten } = useText()
const { statusClass } = useOrder()
</script>

<template>
  <li
    v-if="order"
    class="
      order-card text-primary-950 bg-primary-100 flex flex-col items-center
      justify-between gap-4 rounded border border-primary-500 p-4

      dark:text-primary-50 dark:bg-primary-900 dark:border-primary-500

      md:grid-cols-1 md:grid-rows-3 md:flex-row md:gap-10 md:p-10
    "
  >
    <div class="order-card-items grid gap-2">
      <div class="flex gap-2">
        <OrderCardItem
          v-for="item in order.orderItemOrder.slice(0, maxItems)"
          :key="item.product.id"
          :item="item"
        />
      </div>
      <div
        v-if="order.orderItemOrder.length > maxItems"
        class="grid"
      >
        <span
          v-if="order.orderItemOrder.length - maxItems === 1"
          class="
            text-primary-950 text-xs

            dark:text-primary-50
          "
        >
          {{ $t('components.order.card.extra_one') }}
        </span>
        <span
          v-else
          class="
            text-primary-950 text-xs

            dark:text-primary-50
          "
        >
          {{
            $t('components.order.card.extra', {
              count: order.orderItemOrder.length - maxItems,
            })
          }}
        </span>
      </div>
    </div>

    <div
      class="
        order-card-body grid grid-cols-2 items-center gap-2

        md:grid-cols-3 md:grid-rows-2 md:gap-4
      "
    >
      <div class="order-card-body-status flex items-center gap-2.5">
        <span :class="statusClass(order).color">
          {{ order.status }}
        </span>
        <Component
          :is="statusClass(order).icon"
          :class="statusClass(order).color"
        />
      </div>

      <div class="order-card-body-id grid">
        <span
          class="
            text-primary-950 text-xs

            dark:text-primary-50
          "
        >{{
          $t('components.order.card.id')
        }}</span>
        <span class="font-semibold">{{ order.id }}</span>
      </div>

      <div class="order-card-body-address grid">
        <span
          class="
            text-primary-950 text-xs

            dark:text-primary-50
          "
        >{{
          $t('components.order.card.address')
        }}</span>
        <span>{{ contentShorten(order.fullAddress, 0, 45) }}</span>
      </div>

      <div class="order-card-body-pay_way grid">
        <span
          class="
            text-primary-950 text-xs

            dark:text-primary-50
          "
        >{{
          $t('components.order.card.pay_way')
        }}</span>
        <span>{{ extractTranslated(order.payWay, 'name', locale) }}</span>
      </div>

      <div class="order-card-body-total_price grid">
        <span
          class="
            text-primary-950 text-xs

            dark:text-primary-50
          "
        >{{
          $t('components.order.card.total_price')
        }}</span>
        <I18nN
          tag="span"
          class="font-semibold"
          format="currency"
          :value="order.paidAmount"
        />
      </div>

      <div class="order-card-body-created_at grid">
        <span
          class="
            text-primary-950 text-xs

            dark:text-primary-50
          "
        >{{
          $t('components.order.card.created_at')
        }}</span>
        <NuxtTime :datetime="order.createdAt" />
      </div>
    </div>

    <div class="order-card-footer grid gap-4">
      <div class="order-card-footer-item">
        <UButton
          class="
            py-1.25 w-full text-sm

            md:py-2.5
          "
          :label="$t('components.order.card.actions.details')"
          :to="`/account/orders/${order.id}`"
          color="opposite"
          variant="link"
          size="lg"
        />
      </div>
    </div>
  </li>
</template>
