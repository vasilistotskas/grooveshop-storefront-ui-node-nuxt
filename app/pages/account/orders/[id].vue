<script lang="ts" setup>
const { $i18n } = useNuxtApp()
const { t, locale } = useI18n()
const route = useRoute()
const orderId = 'id' in route.params
  ? route.params.id
  : undefined

const { data: order } = await useFetch<OrderDetail>(`/api/orders/${orderId}`, {
  key: `order${orderId}`,
  method: 'GET',
  headers: useRequestHeaders(),
  query: {
    languageCode: locale,
  },
})

const localePath = useLocalePath()
const { productUrl } = useUrls()
const { isMobileOrTablet } = useDevice()

const orderTimeline = computed(() => {
  if (!order.value?.orderTimeline) return []

  return order.value.orderTimeline
    .filter(item => item.timestamp && item.description)
    .map(item => ({
      date: item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '',
      title: item.changeType || t('status_change'),
      description: item.description || '',
      icon: getTimelineIcon(item.changeType),
      user: item.user,
    }))
    .reverse()
})

const pricingItems = computed(() => {
  if (!order.value?.pricingBreakdown) return []

  const breakdown = order.value.pricingBreakdown
  const items = []

  if (breakdown.itemsSubtotal) {
    items.push({
      label: t('products'),
      amount: breakdown.itemsSubtotal,
      currency: breakdown.currency || 'EUR',
    })
  }

  if (breakdown.shippingCost) {
    items.push({
      label: t('shipping'),
      amount: breakdown.shippingCost,
      currency: breakdown.currency || 'EUR',
    })
  }

  if (breakdown.paymentMethodFee) {
    items.push({
      label: t('payment_method_fee'),
      amount: breakdown.paymentMethodFee,
      currency: breakdown.currency || 'EUR',
    })
  }

  return items
})

const orderSteps = computed(() => {
  const status = order.value?.status?.toLowerCase() || 'pending'
  const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']
  const currentIndex = statusOrder.indexOf(status)

  const steps = [
    {
      title: t('order_placed'),
      description: t('order_placed_desc'),
      icon: 'i-heroicons-shopping-cart',
      value: 'pending',
    },
    {
      title: t('confirmed'),
      description: t('confirmed_desc'),
      icon: 'i-heroicons-check-circle',
      value: 'confirmed',
    },
    {
      title: t('processing'),
      description: t('processing_desc'),
      icon: 'i-heroicons-archive-box',
      value: 'processing',
    },
    {
      title: t('shipped'),
      description: t('shipped_desc'),
      icon: 'i-heroicons-truck',
      value: 'shipped',
    },
    {
      title: t('delivered'),
      description: t('delivered_desc'),
      icon: 'i-heroicons-check-circle',
      value: 'delivered',
    },
  ]

  return steps.map((step, index) => ({
    ...step,
    completed: index <= currentIndex,
    active: index === currentIndex,
  }))
})

const orderProgressPercentage = computed(() => {
  const status = order.value?.status?.toLowerCase() || 'pending'
  const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']
  const currentIndex = statusOrder.indexOf(status)
  return currentIndex >= 0 ? ((currentIndex + 1) / statusOrder.length) * 100 : 0
})

const currentStepValue = computed(() => {
  return order.value?.status?.toLowerCase() || 'pending'
})

const stepperColor = computed(() => {
  const percentage = orderProgressPercentage.value
  if (percentage >= 100) {
    return 'success'
  }
  else if (percentage >= 75) {
    return 'neutral'
  }
  else if (percentage >= 25) {
    return 'warning'
  }
  else {
    return 'info'
  }
})

const orderAlert = computed(() => {
  const status = order.value?.status?.toLowerCase()

  if (status === 'cancelled') {
    return {
      show: true,
      color: 'error' as const,
      title: t('order_cancelled'),
      description: t('order_cancelled_desc'),
      icon: 'i-heroicons-x-circle',
    }
  }

  if (status === 'delivered') {
    return {
      show: true,
      color: 'success' as const,
      title: t('order_delivered'),
      description: t('order_delivered_desc'),
      icon: 'i-heroicons-check-circle',
    }
  }

  if (order.value?.pricingBreakdown?.remainingAmount && order.value.pricingBreakdown.remainingAmount > 0) {
    return {
      show: true,
      color: 'warning' as const,
      title: t('payment_pending'),
      description: t('payment_pending_desc', { amount: $i18n.n(order.value.pricingBreakdown.remainingAmount, 'currency') }),
      icon: 'i-heroicons-credit-card',
    }
  }

  return { show: false, color: 'neutral' as const }
})

const sectionsState = reactive({
  orderItems: true,
  orderSummary: true,
  shippingInfo: true,
  orderDetails: true,
  trackingInfo: true,
  orderHistory: true,
})

function getTimelineIcon(changeType?: string) {
  switch (changeType?.toLowerCase()) {
    case 'created':
    case 'placed':
      return 'i-heroicons-shopping-cart'
    case 'confirmed':
      return 'i-heroicons-check-circle'
    case 'shipped':
      return 'i-heroicons-truck'
    case 'delivered':
      return 'i-heroicons-check-circle'
    case 'cancelled':
      return 'i-heroicons-x-circle'
    case 'payment':
      return 'i-heroicons-credit-card'
    default:
      return 'i-heroicons-clock'
  }
}

function getStatusColor(status?: string): 'success' | 'error' | 'warning' | 'info' | 'neutral' {
  if (!status) return 'neutral'

  switch (status.toUpperCase()) {
    case 'COMPLETED':
    case 'DELIVERED':
      return 'success'
    case 'CANCELED':
    case 'CANCELLED':
    case 'REFUNDED':
      return 'error'
    case 'PROCESSING':
    case 'SHIPPED':
      return 'warning'
    case 'PENDING':
      return 'info'
    default:
      return 'neutral'
  }
}

function getPaymentStatusColor(status?: string): 'success' | 'error' | 'warning' | 'info' | 'neutral' {
  if (!status) return 'neutral'

  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return 'success'
    case 'FAILED':
    case 'CANCELED':
    case 'CANCELLED':
      return 'error'
    case 'PENDING':
    case 'PROCESSING':
      return 'warning'
    case 'REFUNDED':
    case 'PARTIALLY_REFUNDED':
      return 'info'
    default:
      return 'neutral'
  }
}

async function handleCancelOrder() {
  if (!order.value?.canBeCanceled) return
  console.log('Cancelling order:', orderId)
}

async function handleTrackOrder() {
  const trackingUrl = order.value?.trackingDetails?.trackingUrl
  if (trackingUrl) {
    window.open(trackingUrl, '_blank')
  }
}

defineRouteRules({
  robots: false,
})

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    v-if="order"
    class="
      flex flex-col gap-6
      md:gap-8
    "
  >
    <div
      class="
        flex flex-col gap-4
        md:flex-row md:items-center md:justify-between
      "
    >
      <div class="flex items-center gap-4">
        <UButton
          :to="localePath('account-orders')"
          color="neutral"
          variant="outline"
          icon="i-heroicons-arrow-left"
          size="sm"
        >
          {{ t('back') }}
        </UButton>

        <div class="flex flex-col">
          <h1
            class="
              text-2xl font-bold text-gray-900
              dark:text-gray-100
            "
          >
            {{ t('order') }} #{{ order.id }}
          </h1>
          <p
            class="
              text-sm text-gray-500
              dark:text-gray-400
            "
          >
            {{ t('placed_on') }}:
            <NuxtTime
              :datetime="order.createdAt"
              :locale="locale"
              class="
                text-sm text-primary-950
                dark:text-primary-50
              "
            />
          </p>
        </div>
      </div>

      <div class="flex flex-wrap gap-3">
        <UBadge
          :color="getStatusColor(order.status)"
          :label="order.statusDisplay"
          variant="subtle"
          size="lg"
        />

        <UBadge
          v-if="order.paymentStatus"
          :color="getPaymentStatusColor(order.paymentStatus)"
          :label="order.paymentStatus"
          variant="subtle"
          size="lg"
          icon="i-heroicons-credit-card"
        />

        <UBadge
          v-if="order.isPaid"
          color="success"
          label="Paid"
          variant="soft"
          icon="i-heroicons-check-circle"
        />
      </div>
    </div>

    <UAlert
      v-if="orderAlert.show"
      :color="orderAlert.color"
      :title="orderAlert.title"
      :description="orderAlert.description"
      :icon="orderAlert.icon"
      variant="soft"
    />

    <div
      v-if="order.canBeCanceled || order.trackingDetails?.hasTracking" class="
        flex gap-3
      "
    >
      <UButton
        v-if="order.canBeCanceled"
        color="error"
        variant="outline"
        icon="i-heroicons-x-circle"
        @click="handleCancelOrder"
      >
        {{ t('cancel_order') }}
      </UButton>

      <UButton
        v-if="order.trackingDetails?.hasTracking"
        color="primary"
        variant="outline"
        icon="i-heroicons-arrow-top-right-on-square"
        @click="handleTrackOrder"
      >
        {{ t('track_order') }}
      </UButton>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            {{ t('order_progress') }}
          </h2>
          <div class="flex items-center gap-2">
            <UProgress
              :model-value="orderProgressPercentage"
              size="sm"
              class="w-24"
              :color="stepperColor"
              :status="false"
            />
            <span class="text-xs text-gray-500">{{ Math.round(orderProgressPercentage) }}%</span>
          </div>
        </div>
      </template>

      <UStepper
        :items="orderSteps"
        :model-value="currentStepValue"
        disabled
        :orientation="isMobileOrTablet ? 'vertical' : 'horizontal'"
        :color="stepperColor"
        size="md"
        class="w-full"
      />
    </UCard>

    <div
      class="
        flex flex-col gap-6
        md:flex-row
      "
    >
      <UCard
        :ui="{
          root: 'md:min-w-2/3',
        }"
      >
        <template #header>
          <UCollapsible v-model:open="sectionsState.orderItems">
            <UButton
              :label="t('order_items')"
              color="neutral"
              variant="ghost"
              :trailing-icon="sectionsState.orderItems ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="w-full justify-between text-lg font-semibold"
            />

            <template #content>
              <div class="mt-4 max-h-[32rem] space-y-4 overflow-y-auto pr-1">
                <div
                  v-for="item in order.items"
                  :key="`product-${item.product.id}`"
                  class="
                    group relative overflow-hidden rounded-xl border
                    border-gray-200 bg-primary-100 transition-all duration-200
                    hover:border-gray-300 hover:shadow-lg
                    dark:border-gray-700 dark:bg-primary-900
                    dark:hover:border-gray-600
                  "
                >
                  <div class="flex gap-4 p-4">
                    <div class="relative shrink-0">
                      <Anchor
                        :to="{ path: productUrl(item.product.id, item.product.slug) }"
                        class="block"
                      >
                        <div
                          class="
                            relative h-28 w-28 overflow-hidden rounded-lg
                            bg-gray-100
                            sm:h-32 sm:w-32
                            dark:bg-gray-700
                          "
                        >
                          <ImgWithFallback
                            :alt="`Image - ${item.product.id}`"
                            fit="cover"
                            :height="128"
                            :src="item.product.mainImagePath"
                            :width="128"
                            class="
                              h-full w-full object-cover transition-transform
                              duration-200
                              group-hover:scale-105
                            "
                            loading="lazy"
                          />
                        </div>
                      </Anchor>

                      <UBadge
                        :label="`×${item.quantity}`"
                        color="primary"
                        variant="solid"
                        size="sm"
                        class="absolute -top-2 -right-2 shadow-md"
                      />
                    </div>

                    <div class="flex min-w-0 flex-1 flex-col">
                      <Anchor
                        :to="{ path: productUrl(item.product.id, item.product.slug) }"
                        class="group/link"
                        :ui="{
                          base: 'p-0',
                        }"
                      >
                        <h3
                          class="
                            line-clamp-2 text-start text-lg font-semibold
                            text-gray-900 transition-colors
                            group-hover/link:text-primary-600
                            dark:text-gray-100
                            dark:group-hover/link:text-primary-400
                          "
                        >
                          {{ extractTranslated(item.product, 'name', locale) }}
                        </h3>
                      </Anchor>

                      <div
                        class="
                          mt-2 flex flex-wrap items-center gap-x-3 gap-y-1
                          text-xs text-gray-500
                          dark:text-gray-400
                        "
                      >
                        <span class="font-mono">#{{ item.product.id }}</span>
                        <span
                          v-if="item.product.weight?.value"
                          class="flex items-center gap-1"
                        >
                          <UIcon name="i-heroicons-scale" class="h-3 w-3" />
                          {{ item.product.weight.value }}{{ item.product.weight.unit || 'kg' }}
                        </span>
                      </div>

                      <div class="mt-3 flex flex-wrap items-center gap-3">
                        <span
                          class="
                            text-sm text-gray-600
                            dark:text-gray-400
                          "
                        >
                          {{ t('unit_price') }}:
                        </span>
                        <div class="flex items-center gap-2">
                          <span
                            v-if="item.product.discountPercent && item.product.discountPercent > 0"
                            class="
                              text-sm text-gray-400 line-through
                              dark:text-gray-500
                            "
                          >
                            {{ $i18n.n(item.product.price, 'currency') }}
                          </span>

                          <span
                            class="
                              font-semibold text-gray-900
                              dark:text-gray-100
                            "
                          >
                            {{ $i18n.n(item.product.finalPrice, 'currency') }}
                          </span>

                          <UBadge
                            v-if="item.product.discountPercent && item.product.discountPercent > 0"
                            :label="`-${item.product.discountPercent}%`"
                            color="success"
                            variant="soft"
                            size="sm"
                          />
                        </div>
                      </div>

                      <div
                        class="
                          mt-auto flex items-end justify-between gap-4 border-t
                          border-gray-100 pt-3
                          dark:border-gray-700
                        "
                      >
                        <div
                          class="
                            flex items-center gap-2 text-sm text-gray-600
                            dark:text-gray-400
                          "
                        >
                          <UIcon name="i-heroicons-archive-box" class="h-4 w-4" />
                          <span>{{ t('quantity') }}: {{ item.quantity }}</span>
                        </div>

                        <div class="text-right">
                          <div
                            class="
                              text-xs text-gray-500
                              dark:text-gray-400
                            "
                          >
                            {{ t('subtotal') }}
                          </div>
                          <div
                            v-if="item.quantity"
                            class="
                              text-lg font-bold text-gray-900
                              dark:text-gray-100
                            "
                          >
                            {{ $i18n.n(item.totalPrice || (item.product.finalPrice * item.quantity), 'currency') }}
                          </div>
                        </div>
                      </div>

                      <div
                        v-if="item.quantity && item.product.discountPercent && item.product.discountPercent > 0"
                        class="
                          mt-2 flex items-center gap-1 text-sm text-green-600
                          dark:text-green-400
                        "
                      >
                        <UIcon name="i-heroicons-tag" class="h-4 w-4" />
                        <span>
                          {{ t('you_save') }}:
                          {{ $i18n.n((item.product.price - item.product.finalPrice) * item.quantity, 'currency') }}
                        </span>
                      </div>

                      <div
                        v-if="item.product.reviewCount > 0"
                        class="
                          mt-2 flex items-center gap-2 text-sm text-gray-600
                          dark:text-gray-400
                        "
                      >
                        <div class="flex items-center">
                          <UIcon
                            name="i-heroicons-star" class="
                              h-4 w-4 text-yellow-400
                            "
                          />
                          <span class="ml-1">{{ item.product.reviewAverage?.toFixed(1) || 0 }}</span>
                        </div>
                        <span>({{ item.product.reviewCount }} {{ t('reviews') }})</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </UCollapsible>
        </template>
      </UCard>

      <UCard
        :ui="{
          root: `
            max-h-fit
            md:min-w-1/3
          `,
        }"
      >
        <template #header>
          <UCollapsible v-model:open="sectionsState.orderSummary">
            <UButton
              :label="t('order_summary')"
              color="neutral"
              variant="ghost"
              :trailing-icon="sectionsState.orderSummary ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="w-full justify-between text-lg font-semibold"
            />

            <template #content>
              <div class="mt-4 space-y-4">
                <div class="space-y-3">
                  <div
                    v-for="item in pricingItems"
                    :key="item.label"
                    class="flex justify-between text-sm"
                  >
                    <span
                      class="
                        text-gray-600
                        dark:text-gray-400
                      "
                    >{{ item.label }}</span>
                    <span class="font-medium">{{ $i18n.n(item.amount, 'currency') }}</span>
                  </div>
                </div>

                <USeparator />

                <div class="flex justify-between text-lg font-semibold">
                  <span>{{ t('total') }}</span>
                  <span>{{ $i18n.n(order.paidAmount, 'currency') }}</span>
                </div>

                <div
                  v-if="order.pricingBreakdown?.remainingAmount && order.pricingBreakdown.remainingAmount > 0"
                  class="
                    flex justify-between text-sm text-amber-600
                    dark:text-amber-400
                  "
                >
                  <span>{{ t('remaining_amount') }}</span>
                  <span>{{ $i18n.n(order.pricingBreakdown.remainingAmount, 'currency') }}</span>
                </div>
              </div>
            </template>
          </UCollapsible>
        </template>
      </UCard>
    </div>

    <div
      class="
        grid gap-6
        lg:grid-cols-2
      "
    >
      <UCard>
        <template #header>
          <UCollapsible v-model:open="sectionsState.shippingInfo">
            <UButton
              :label="t('shipping_information')"
              color="neutral"
              variant="ghost"
              :trailing-icon="sectionsState.shippingInfo ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="w-full justify-between text-lg font-semibold"
            />

            <template #content>
              <div class="mt-4 space-y-4">
                <div class="grid gap-4">
                  <div>
                    <label
                      class="
                        text-sm font-medium text-gray-700
                        dark:text-gray-300
                      "
                    >
                      {{ t('customer_name') }}
                    </label>
                    <p
                      class="
                        mt-1 text-gray-900
                        dark:text-gray-100
                      "
                    >
                      {{ order.customerFullName }}
                    </p>
                  </div>

                  <div>
                    <label
                      class="
                        text-sm font-medium text-gray-700
                        dark:text-gray-300
                      "
                    >
                      {{ t('email') }}
                    </label>
                    <p
                      class="
                        mt-1 text-gray-900
                        dark:text-gray-100
                      "
                    >
                      {{ order.email }}
                    </p>
                  </div>

                  <div v-if="order.phone">
                    <label
                      class="
                        text-sm font-medium text-gray-700
                        dark:text-gray-300
                      "
                    >
                      {{ t('phone') }}
                    </label>
                    <p
                      class="
                        mt-1 text-gray-900
                        dark:text-gray-100
                      "
                    >
                      {{ order.phone }}
                    </p>
                  </div>

                  <div>
                    <label
                      class="
                        text-sm font-medium text-gray-700
                        dark:text-gray-300
                      "
                    >
                      {{ t('shipping_address') }}
                    </label>
                    <p
                      class="
                        mt-1 whitespace-pre-line text-gray-900
                        dark:text-gray-100
                      "
                    >
                      {{ order.fullAddress }}
                    </p>
                  </div>
                </div>
              </div>
            </template>
          </UCollapsible>
        </template>
      </UCard>

      <UCard>
        <template #header>
          <UCollapsible v-model:open="sectionsState.orderDetails">
            <UButton
              :label="t('order_details')"
              color="neutral"
              variant="ghost"
              :trailing-icon="sectionsState.orderDetails ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="w-full justify-between text-lg font-semibold"
            />

            <template #content>
              <div class="mt-4 space-y-4">
                <div class="grid gap-4">
                  <div v-if="order.paymentMethod">
                    <label
                      class="
                        text-sm font-medium text-gray-700
                        dark:text-gray-300
                      "
                    >
                      {{ t('payment_method') }}
                    </label>
                    <p
                      class="
                        mt-1 text-gray-900
                        dark:text-gray-100
                      "
                    >
                      {{ order.paymentMethod }}
                    </p>
                  </div>

                  <div v-if="order.documentType">
                    <label
                      class="
                        text-sm font-medium text-gray-700
                        dark:text-gray-300
                      "
                    >
                      {{ t('document_type') }}
                    </label>
                    <p
                      class="
                        mt-1 text-gray-900
                        dark:text-gray-100
                      "
                    >
                      {{ order.documentType }}
                    </p>
                  </div>

                  <div v-if="order.customerNotes">
                    <label
                      class="
                        text-sm font-medium text-gray-700
                        dark:text-gray-300
                      "
                    >
                      {{ t('customer_notes') }}
                    </label>
                    <p
                      class="
                        mt-1 rounded-md bg-gray-50 p-3 text-gray-900
                        dark:bg-gray-800 dark:text-gray-100
                      "
                    >
                      {{ order.customerNotes }}
                    </p>
                  </div>

                  <div>
                    <label
                      class="
                        text-sm font-medium text-gray-700
                        dark:text-gray-300
                      "
                    >
                      {{ t('order_uuid') }}
                    </label>
                    <p
                      class="
                        mt-1 font-mono text-xs text-gray-600
                        dark:text-gray-400
                      "
                    >
                      {{ order.uuid }}
                    </p>
                  </div>
                </div>
              </div>
            </template>
          </UCollapsible>
        </template>
      </UCard>
    </div>

    <UCard v-if="order.trackingDetails && order.trackingDetails.hasTracking">
      <template #header>
        <div class="flex w-full items-center justify-between">
          <UCollapsible v-model:open="sectionsState.trackingInfo" class="flex-1">
            <UButton
              :label="t('tracking_information')"
              color="neutral"
              variant="ghost"
              :trailing-icon="sectionsState.trackingInfo ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="w-full flex-1 justify-between text-lg font-semibold"
            />

            <template #content>
              <div
                class="
                  mt-4 grid gap-4
                  md:grid-cols-2
                "
              >
                <div v-if="order.trackingDetails.trackingNumber">
                  <label
                    class="
                      text-sm font-medium text-gray-700
                      dark:text-gray-300
                    "
                  >
                    {{ t('tracking_number') }}
                  </label>
                  <p
                    class="
                      mt-1 font-mono text-gray-900
                      dark:text-gray-100
                    "
                  >
                    {{ order.trackingDetails.trackingNumber }}
                  </p>
                </div>

                <div v-if="order.trackingDetails.shippingCarrier">
                  <label
                    class="
                      text-sm font-medium text-gray-700
                      dark:text-gray-300
                    "
                  >
                    {{ t('shipping_carrier') }}
                  </label>
                  <p
                    class="
                      mt-1 text-gray-900
                      dark:text-gray-100
                    "
                  >
                    {{ order.trackingDetails.shippingCarrier }}
                  </p>
                </div>
              </div>
            </template>
          </UCollapsible>

          <UBadge
            v-if="order.trackingDetails.estimatedDelivery"
            color="info"
            variant="soft"
            :label="`ETA: ${$d(new Date(order.trackingDetails.estimatedDelivery), 'short')}`"
            class="ml-2"
          />
        </div>
      </template>
    </UCard>

    <UCard v-if="orderTimeline.length > 0">
      <template #header>
        <UCollapsible v-model:open="sectionsState.orderHistory">
          <UButton
            :label="t('order_history')"
            color="neutral"
            variant="ghost"
            :trailing-icon="sectionsState.orderHistory ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
            class="w-full justify-between text-lg font-semibold"
          />

          <template #content>
            <UTimeline
              :items="orderTimeline"
              size="sm"
              class="mt-4"
            >
              <template #date="{ item }">
                <span
                  class="
                    text-xs text-gray-500
                    dark:text-gray-400
                  "
                >
                  {{ item.date }}
                </span>
              </template>

              <template #description="{ item }">
                <div>
                  <p
                    class="
                      text-sm text-gray-600
                      dark:text-gray-400
                    "
                  >
                    {{ item.description }}
                  </p>
                  <p
                    v-if="item.user" class="
                      mt-1 text-xs text-gray-500
                      dark:text-gray-500
                    "
                  >
                    {{ t('by') }}: {{ item.user }}
                  </p>
                </div>
              </template>
            </UTimeline>
          </template>
        </UCollapsible>
      </template>
    </UCard>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  back: Πίσω
  order: Παραγγελία
  number: Παραγγελία
  placed_on: Δημιουργήθηκε στις
  order_progress: Πρόοδος Παραγγελίας
  order_placed: Παραγγελία
  order_placed_desc: Η παραγγελία σας δημιουργήθηκε
  confirmed: Επιβεβαιώθηκε
  confirmed_desc: Η παραγγελία επιβεβαιώθηκε
  processing: Επεξεργασία
  processing_desc: Η παραγγελία επεξεργάζεται
  shipped: Απεστάλη
  shipped_desc: Η παραγγελία απεστάλη
  delivered: Παραδόθηκε
  delivered_desc: Η παραγγελία παραδόθηκε
  order_items: Προϊόντα Παραγγελίας
  order_summary: Σύνοψη Παραγγελίας
  quantity: Ποσότητα
  unit_price: Τιμή Μονάδας
  subtotal: Υποσύνολο
  you_save: Εξοικονομείτε
  reviews: κριτικές
  details: Λεπτομέρειες
  shipping: Έξοδα αποστολής
  synopsis: Συνοπτικά
  products: Προϊόντα
  total: Σύνολο
  extras: Πρόσθετα
  remaining_amount: Υπόλοιπο ποσό
  shipping_information: Στοιχεία Αποστολής
  customer_name: Όνομα Πελάτη
  email: Email
  phone: Τηλέφωνο
  shipping_address: Διεύθυνση Αποστολής
  order_details: Λεπτομέρειες Παραγγελίας
  payment_method: Τρόπος Πληρωμής
  address: Διεύθυνση
  document_type: Τύπος Παραστατικού
  pay_way: Τρόπος Πληρωμής
  payment_status: Κατάσταση Πληρωμής
  customer_notes: Σημειώσεις Πελάτη
  order_uuid: UUID Παραγγελίας
  tracking_information: Στοιχεία Παρακολούθησης
  tracking_number: Αριθμός Αποστολής
  shipping_carrier: Εταιρία Μεταφορών
  order_history: Ιστορικό Παραγγελίας
  status_change: Αλλαγή Κατάστασης
  by: από
  cancel_order: Ακύρωση Παραγγελίας
  track_order: Παρακολούθηση Παραγγελίας
  order_cancelled: Παραγγελία Ακυρωμένη
  order_cancelled_desc: Αυτή η παραγγελία έχει ακυρωθεί
  order_delivered: Παραγγελία Παραδόθηκε
  order_delivered_desc: Η παραγγελία σας παραδόθηκε επιτυχώς
  payment_pending: Εκκρεμής Πληρωμή
  payment_method_fee: Χρέωση μεθόδου πληρωμής
  payment_pending_desc: Υπάρχει εκκρεμές ποσό {amount} για αυτή την παραγγελία
</i18n>
