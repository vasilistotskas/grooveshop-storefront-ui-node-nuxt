<script lang="ts" setup>
import type { PropType } from 'vue'

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

const { t, locale } = useI18n()
const { contentShorten } = useText()
const { statusClass, paymentStatusClass } = useOrder()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()
</script>

<template>
  <li
    v-if="order"
    class="
      flex flex-col items-center justify-between gap-4 rounded border
      border-primary-500 bg-primary-100 p-4 text-primary-950
      md:grid-cols-1 md:grid-rows-3 md:flex-row md:gap-10 md:p-6
      dark:border-primary-500 dark:bg-primary-900 dark:text-primary-50
    "
  >
    <div class="grid gap-2">
      <div class="flex gap-2">
        <OrderCardItem
          v-for="item in order.items.slice(0, maxItems)"
          :key="`product-${item.product}`"
          :item="item"
        />
      </div>
      <div
        v-if="order.items.length > maxItems"
        class="grid"
      >
        <span
          class="
            text-xs text-primary-950
            dark:text-primary-50
          "
        >
          {{ t('extra', {
            count: order.items.length - maxItems,
          }) }}
        </span>
      </div>
    </div>

    <div
      class="
        grid grid-cols-2 items-center gap-2
        md:grid-cols-3 md:grid-rows-3 md:gap-4
      "
    >
      <div class="flex items-center gap-2.5">
        <span :class="statusClass(order).color">
          {{ order.status }}
        </span>
        <UIcon
          :name="statusClass(order).icon"
          :class="statusClass(order).color"
        />
      </div>

      <div class="flex items-center gap-2.5">
        <span :class="paymentStatusClass(order.paymentStatus || '').color">
          {{ order.paymentStatus }}
        </span>
        <UIcon
          :name="paymentStatusClass(order.paymentStatus || '').icon"
          :class="paymentStatusClass(order.paymentStatus || '').color"
        />
      </div>

      <div class="grid">
        <span
          class="
            text-xs text-primary-950
            dark:text-primary-50
          "
        >{{
          t('id')
        }}</span>
        <span class="font-semibold">{{ order.id }}</span>
      </div>

      <div class="grid">
        <span
          class="
            text-xs text-primary-950
            dark:text-primary-50
          "
        >{{
          t('address')
        }}</span>
        <span>{{ contentShorten(order.fullAddress, 0, 45) }}</span>
      </div>

      <div class="grid">
        <span
          class="
            text-xs text-primary-950
            dark:text-primary-50
          "
        >{{
          t('pay_way')
        }}</span>
        <span>{{ typeof order.payWay === 'number' ? 'Payment Method' : extractTranslated(order.payWay, 'name', locale) }}</span>
      </div>

      <div class="grid">
        <span
          class="
            text-xs text-primary-950
            dark:text-primary-50
          "
        >{{
          t('total_price')
        }}</span>
        <span
          class="font-semibold"
        >
          {{ $i18n.n(order.paidAmount, 'currency') }}
        </span>
      </div>

      <div class="grid">
        <span
          class="
            text-xs text-primary-950
            dark:text-primary-50
          "
        >{{
          $i18n.t('ordering.created_at')
        }}</span>
        <NuxtTime
          :datetime="order.createdAt"
          :locale="locale"
        />
      </div>
    </div>

    <div class="grid gap-4">
      <UButton
        :label="t('actions.details')"
        :to="localePath({ name: 'account-orders-id', params: { id: order.id } })"
        class="
          w-full py-1.25 text-sm
          md:py-2.5
        "
        color="secondary"
        size="lg"
        variant="link"
      />
    </div>
  </li>
</template>

<i18n lang="yaml">
el:
  extra: Κανένα προϊόν | 1 προϊόν | {count} ακόμη προϊόντα
  id: ID
  address: Διεύθυνση
  pay_way: Τρόπος πληρωμής
  total_price: Συνολικό ποσό
  tracking: Αρ. Αποστολής
  actions:
    details: Λεπτομέρειες
</i18n>
