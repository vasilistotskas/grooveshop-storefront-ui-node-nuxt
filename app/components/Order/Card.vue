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
const { isMobileOrTablet } = useDevice()

const statusColor = computed(() => {
  switch (order.value.status) {
    case 'PENDING':
      return 'warning'
    case 'PROCESSING':
      return 'info'
    case 'SHIPPED':
      return 'primary'
    case 'DELIVERED':
    case 'COMPLETED':
      return 'success'
    case 'CANCELED':
    case 'REFUNDED':
      return 'error'
    default:
      return 'neutral'
  }
})

const paymentColor = computed(() => {
  switch (order.value.paymentStatus) {
    case 'COMPLETED':
      return 'success'
    case 'PENDING':
    case 'PROCESSING':
      return 'warning'
    case 'FAILED':
    case 'CANCELED':
      return 'error'
    case 'REFUNDED':
    case 'PARTIALLY_REFUNDED':
      return 'info'
    default:
      return 'neutral'
  }
})

const customerName = computed(() => {
  return `${order.value.firstName} ${order.value.lastName}`.trim()
})

const shortAddress = computed(() => {
  return contentShorten(order.value.fullAddress, 0, 35)
})

const paymentMethodDisplay = computed(() => {
  return order.value.paymentMethod || `Method ${order.value.payWay}`
})

const actionButtonOrientation = computed(() => {
  if (isMobileOrTablet) {
    return 'horizontal'
  }
  return order.value.canBeCanceled ? 'vertical' : 'horizontal'
})

const customerInitials = computed(() => {
  const names = customerName.value.split(' ')
  return names.map(name => name.charAt(0).toUpperCase()).join('')
})
</script>

<template>
  <UCard
    v-if="order"
    class="
      transition-all duration-200
      hover:shadow-md
    "
    :ui="{
      root: `
        bg-primary-100 text-primary-950 overflow-hidden
        dark:bg-primary-900 dark:text-primary-50
      `,
      body: 'p-0',
    }"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <UFieldGroup>
          <UBadge
            :label="`#${order.id}`"
            color="neutral"
            variant="soft"
            size="md"
            class="font-mono"
          />
        </UFieldGroup>

        <UFieldGroup v-if="order.isPaid || order.canBeCanceled">
          <UBadge
            v-if="order.isPaid"
            color="success"
            variant="soft"
            icon="i-heroicons-check-circle"
            :label="t('paid')"
          />
          <UBadge
            v-if="order.canBeCanceled"
            color="warning"
            variant="outline"
            icon="i-heroicons-clock"
            :label="t('cancelable')"
            size="xs"
          />
        </UFieldGroup>
      </div>
    </template>

    <div
      class="
        space-y-5 p-2
        md:p-0
      "
    >
      <div
        class="flex flex-col items-center gap-3"
      >
        <div class="h-full w-full">
          <div class="mb-3 flex w-full items-center gap-2">
            <UIcon name="i-heroicons-shopping-bag" class="h-5 w-5 text-gray-500" />
            <span
              class="
                text-base font-semibold text-gray-700
                dark:text-gray-300
              "
            >
              {{ t('order_items') }}
            </span>
          </div>

          <div class="flex items-center gap-3">
            <div class="flex gap-3">
              <OrderCardItem
                v-for="item in order.items.slice(0, maxItems)"
                :key="`product-${item.product}`"
                :item="item"
                class="flex-shrink-0"
              />
            </div>

            <UBadge
              v-if="order.items.length > maxItems"
              :label="`+ ${t('extra', { count: order.items.length - maxItems })}`"
              color="neutral"
              variant="subtle"
            />
          </div>
        </div>

        <div
          class="
            flex w-full flex-col items-start gap-3
            md:flex-row
          "
        >
          <div class="flex w-full flex-col items-start">
            <div class="mb-3 flex w-full items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-truck" class="h-5 w-5 text-gray-500" />
                <span
                  class="
                    text-base font-semibold text-gray-700
                    dark:text-gray-300
                  "
                >
                  {{ t('order_status') }}
                </span>
              </div>
              <UFieldGroup>
                <UBadge
                  :color="statusColor"
                  :label="order.statusDisplay || order.status"
                  variant="soft"
                  size="md"
                />
                <UBadge
                  color="neutral"
                  variant="outline"
                  :icon="statusClass(order).icon"
                  size="md"
                  square
                />
              </UFieldGroup>
            </div>
            <div
              v-if="order.paymentStatus" class="
                flex w-full flex-col items-start
              "
            >
              <div class="flex w-full items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <UIcon
                    name="i-heroicons-credit-card" class="h-5 w-5 text-gray-500"
                  />
                  <span
                    class="
                      text-base font-semibold text-gray-700
                      dark:text-gray-300
                    "
                  >
                    {{ t('payment_status') }}
                  </span>
                </div>
                <UFieldGroup>
                  <UBadge
                    :color="paymentColor"
                    :label="order.paymentStatus"
                    variant="soft"
                    size="md"
                  />
                  <UBadge
                    color="neutral"
                    variant="outline"
                    :icon="paymentStatusClass(order.paymentStatus || '').icon"
                    size="md"
                    square
                  />
                </UFieldGroup>
              </div>
            </div>
          </div>
        </div>
      </div>

      <USeparator />

      <div class="flex items-center justify-between gap-3">
        <div class="flex h-full w-full flex-col">
          <div class="mb-3 flex items-center gap-2">
            <UIcon name="i-heroicons-user" class="h-5 w-5 text-gray-500" />
            <span
              class="
                text-base font-semibold text-gray-700
                dark:text-gray-300
              "
            >
              {{ t('customer_info') }}
            </span>
          </div>

          <UUser
            :name="customerName"
            :description="order.email"
            :avatar="{
              text: customerInitials,
              size: 'md',
            }"
            size="md"
          />
        </div>

        <div class="flex h-full w-full flex-col">
          <div
            class="
              mb-2 flex items-center gap-2 text-sm text-gray-500
              dark:text-gray-400
            "
          >
            <UIcon name="i-heroicons-credit-card" class="h-4 w-4" />
            {{ t('payment_method') }}
          </div>
          <p
            class="
              text-gray-700
              dark:text-gray-300
            "
          >
            {{ paymentMethodDisplay }}
          </p>
        </div>
      </div>

      <div
        class="
          flex flex-col gap-5
          md:flex-row
        "
      >
        <div class="flex-1">
          <div
            class="
              mb-2 flex items-center gap-2 text-sm text-gray-500
              dark:text-gray-400
            "
          >
            <UIcon name="i-heroicons-map-pin" class="h-4 w-4" />
            {{ t('address') }}
          </div>
          <p
            class="
              text-gray-700
              dark:text-gray-300
            " :title="order.fullAddress"
          >
            {{ shortAddress }}
          </p>
        </div>
      </div>

      <div class="flex justify-between gap-8">
        <div>
          <div
            class="
              mb-2 flex items-center gap-2 text-sm text-gray-500
              dark:text-gray-400
            "
          >
            <UIcon name="i-heroicons-calendar" class="h-4 w-4" />
            {{ t('order_date') }}
          </div>
          <NuxtTime
            :datetime="order.createdAt"
            :locale="locale"
            :date-style="'medium'"
            :time-style="'medium'"
            class="
              text-gray-700
              dark:text-gray-300
            "
          />
        </div>

        <div v-if="order.shippingPrice > 0">
          <div
            class="
              mb-2 flex items-center gap-2 text-sm text-gray-500
              dark:text-gray-400
            "
          >
            <UIcon name="i-heroicons-truck" class="h-4 w-4" />
            {{ t('shipping') }}
          </div>
          <p
            class="
              text-gray-700
              dark:text-gray-300
            "
          >
            {{ $i18n.n(order.shippingPrice, 'currency') }}
          </p>
        </div>
      </div>

      <USeparator />

      <div class="flex flex-col items-end">
        <div
          class="
            mb-2 flex items-center gap-2 text-sm text-gray-500
            dark:text-gray-400
          "
        >
          <UIcon name="i-heroicons-currency-euro" class="h-4 w-4" />
          {{ t('total_price') }}
        </div>
        <p
          class="
            text-lg font-bold text-gray-900
            dark:text-gray-100
          "
        >
          {{ $i18n.n(order.paidAmount, 'currency') }}
        </p>
      </div>

      <div
        class="
          flex flex-col justify-between gap-2 border-t border-gray-200 pt-4
          md:flex-row md:items-center md:gap-0
          dark:border-gray-700
        "
      >
        <div
          class="
            flex items-center gap-2 text-sm text-gray-500
            dark:text-gray-400
          "
        >
          <UIcon name="i-heroicons-clock" class="h-4 w-4" />
          <span>{{ t('created_at') }}:</span>
          <NuxtTime :datetime="order.createdAt" :locale="locale" />
        </div>

        <UFieldGroup :orientation="actionButtonOrientation">
          <UButton
            v-if="order.canBeCanceled"
            color="error"
            variant="outline"
            size="md"
            trailing-icon="i-heroicons-x-circle"
            :ui="{
              base: 'w-full justify-center',
            }"
          >
            {{ t('cancel') }}
          </UButton>

          <UButton
            :to="localePath({ name: 'account-orders-id', params: { id: order.id } })"
            color="neutral"
            variant="outline"
            size="md"
            icon="i-heroicons-eye"
            trailing
            :ui="{
              base: 'w-full justify-center',
            }"
          >
            {{ t('actions.details') }}
          </UButton>
        </UFieldGroup>
      </div>
    </div>
  </UCard>
</template>

<i18n lang="yaml">
el:
  extra: Κανένα προϊόν | 1 προϊόν | {count} ακόμη προϊόντα
  order_items: Προϊόντα Παραγγελίας
  order_status: Κατάσταση Παραγγελίας
  payment_status: Κατάσταση Πληρωμής
  customer_info: Στοιχεία Πελάτη
  address: Διεύθυνση
  payment_method: Τρόπος Πληρωμής
  order_date: Ημερομηνία Παραγγελίας
  total_price: Συνολικό ποσό
  shipping: Έξοδα αποστολής
  created_at: Δημιουργήθηκε
  cancel: Ακύρωση
  paid: Πληρωμένη
  cancelable: Ακυρώσιμη
  actions:
    details: Λεπτομέρειες
</i18n>
