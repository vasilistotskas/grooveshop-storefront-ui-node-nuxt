<script lang="ts" setup>
import type { TableColumn } from '#ui/types'

const UAvatar = resolveComponent('UAvatar')

const route = useRoute('checkout-success-uuid')
const orderUUID = 'uuid' in route.params ? route.params.uuid : undefined

const sessionId = computed(() => route.query.session_id as string | undefined)
const fromCheckout = computed(() => !!sessionId.value)
const sessionVerified = ref(false)
const verifyingSession = ref(false)

const { $i18n } = useNuxtApp()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const img = useImage()

const getImage = (mainImagePath: string) => {
  return img(mainImagePath, { width: 96, height: 96, fit: 'cover' }, {
    provider: 'mediaStream',
  })
}

const { data: order, error, refresh } = await useFetch(
  `/api/orders/uuid/${orderUUID}`,
  {
    key: `order${orderUUID}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      languageCode: locale,
    },
  },
)

if (!order.value || error.value) {
  throw createError({
    statusCode: 404,
    message: t('error.page.not.found'),
  })
}

const customerName = computed(() => {
  const firstName = order.value?.firstName
  const lastName = order.value?.lastName
  return `${firstName} ${lastName}`
})

const customerEmail = computed(() => order.value?.email)
const orderNumber = computed(() => order.value?.id)
const orderItems = computed(() => order.value?.items || [])

const paymentStatus = computed(() => order.value?.paymentStatus || '')
const isPaid = computed(() => order.value?.isPaid || false)

const paidAmount = computed(() => order.value?.paidAmount || 0)
const shippingPrice = computed(() => order.value?.shippingPrice || 0)
const totalPriceItems = computed(() => order.value?.totalPriceItems || 0)
const totalPriceExtra = computed(() => order.value?.totalPriceExtra || 0)

const trackingNumber = computed(() => order.value?.trackingNumber)
const shippingCarrier = computed(() => order.value?.shippingCarrier)

// Verify payment session once when coming from checkout
onMounted(async () => {
  if (sessionId.value && order.value && !order.value.isPaid) {
    verifyingSession.value = true
    try {
      // Wait a bit for webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Refresh order data once
      await refresh()

      // Mark as verified regardless of payment status
      // The order status will show the actual payment state
      sessionVerified.value = true
    }
    catch (err) {
      console.error('Failed to verify session:', err)
      sessionVerified.value = true // Mark as verified even on error
    }
    finally {
      verifyingSession.value = false
    }
  }
  else if (sessionId.value && order.value?.isPaid) {
    // Already paid, mark as verified immediately
    sessionVerified.value = true
  }
})

const getPaymentStatusColor = (status: OrderDetail['paymentStatus']) => {
  const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral' | 'info'> = {
    pending: 'warning',
    processing: 'warning',
    completed: 'success',
    failed: 'error',
    refunded: 'info',
    partially_refunded: 'info',
    canceled: 'error',
  }
  if (!status) return 'neutral'
  return colors[status.toLowerCase()] || 'neutral'
}

const orderItemColumns: TableColumn<OrderItemDetail>[] = [
  {
    accessorKey: 'product.mainImagePath',
    header: t('image'),
    cell: ({ row }) => {
      const item = row.original
      return h(UAvatar, {
        src: getImage(item.product?.mainImagePath),
        alt: `${extractTranslated(item.product, 'name', locale.value)} image`,
        size: '3xl',
        class: 'rounded-md',
      })
    },
  },
  {
    accessorKey: 'product.name',
    header: t('product'),
    cell: ({ row }) => {
      const item = row.original
      return h('div', { class: 'space-y-1' }, [
        h('p', { class: 'font-medium text-highlighted' },
          extractTranslated(item.product, 'name', locale.value),
        ),
        item.notes && h('p', { class: 'text-sm text-muted' }, item.notes),
      ])
    },
  },
  {
    accessorKey: 'quantity',
    header: t('quantity'),
    cell: ({ row }) => {
      const item = row.original
      return h('div', { class: 'text-center' }, [
        h('span', { class: 'font-medium' }, item.quantity),
        (item.refundedQuantity || 0) > 0 && h('div', { class: 'text-xs text-error' },
          `(${item.refundedQuantity} ${t('refunded')})`,
        ),
      ])
    },
  },
  {
    accessorKey: 'price',
    header: t('price.unit'),
    cell: ({ row }) => {
      const item = row.original
      return h('div', { class: 'text-right space-y-1' }, [
        h('span', { class: 'font-medium' }, $i18n.n(item.price || 0, 'currency')),
        (item.refundedAmount || 0) > 0 && h('div', { class: 'text-xs text-error' },
          `- ${$i18n.n(item.refundedAmount || 0, 'currency')}`,
        ),
      ])
    },
  },
  {
    accessorKey: 'totalPrice',
    header: t('price.total'),
    cell: ({ row }) => {
      const item = row.original
      return h('div', { class: 'text-right' }, [
        h('span', { class: 'font-semibold text-highlighted' },
          $i18n.n(item.totalPrice || 0, 'currency'),
        ),
      ])
    },
  },
]

defineRouteRules({
  robots: false,
})

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper
    class="
      flex flex-col gap-6
      md:gap-8
    "
  >
    <PageTitle
      :text="t('title')"
      class="text-center"
    />

    <UAlert
      v-if="fromCheckout && verifyingSession"
      color="info"
      variant="subtle"
      icon="i-heroicons-arrow-path"
      class="mx-auto max-w-2xl animate-pulse"
    >
      <template #title>
        {{ t('verifying.payment') }}
      </template>
      <template #description>
        {{ t('verifying.description') }}
      </template>
    </UAlert>

    <UAlert
      v-else-if="fromCheckout && sessionVerified"
      color="success"
      variant="subtle"
      icon="i-heroicons-check-circle"
      class="mx-auto max-w-2xl"
    >
      <template #title>
        {{ t('payment.completed.title') }}
      </template>
      <template #description>
        {{ t('payment.completed.description') }}
      </template>
    </UAlert>

    <UAlert
      v-else
      color="success"
      variant="subtle"
      :title="t('main.title', { customerName })"
      :description="t('main.subtitle')"
      icon="i-heroicons-check-circle"
      class="mx-auto max-w-2xl"
    />

    <div
      class="
        flex flex-col gap-6
        md:grid
        lg:grid-cols-3
      "
    >
      <div
        class="
          space-y-6
          lg:col-span-2
        "
      >
        <UCard>
          <template #header>
            <div class="flex items-center">
              <h2 class="text-xl font-semibold text-highlighted">
                {{ t('order.items') }}
              </h2>
            </div>
          </template>

          <UTable
            :data="orderItems"
            :columns="orderItemColumns"
            :ui="{
              root: 'overflow-auto',
              base: 'min-w-full overflow-auto',
              thead: 'bg-elevated/50',
            }"
          />
        </UCard>
      </div>

      <div class="space-y-6">
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold text-highlighted">
              {{ t('order.summary') }}
            </h2>
          </template>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-muted">{{ t('order.number') }}</span>
              <span class="font-mono font-medium">#{{ orderNumber }}</span>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-muted">{{ t('customer.name') }}</span>
                <span class="font-medium">{{ customerName }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted">{{ t('customer.email') }}</span>
                <span class="text-sm">{{ customerEmail }}</span>
              </div>
            </div>

            <USeparator />

            <div class="flex items-center justify-between">
              <span class="text-muted">{{ t('payment.status') }}</span>
              <UBadge
                :color="getPaymentStatusColor(paymentStatus)"
                variant="subtle"
              >
                {{ isPaid ? t('payment.paid') : t('payment.pending') }}
              </UBadge>
            </div>

            <div v-if="trackingNumber" class="space-y-2">
              <USeparator />
              <div class="flex items-center justify-between">
                <span class="text-muted">{{ t('tracking.number') }}</span>
                <span class="font-mono text-sm">{{ trackingNumber }}</span>
              </div>
              <div
                v-if="shippingCarrier" class="flex items-center justify-between"
              >
                <span class="text-muted">{{ t('shipping.carrier') }}</span>
                <span class="text-sm">{{ shippingCarrier }}</span>
              </div>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold text-highlighted">
              {{ t('pricing.breakdown') }}
            </h2>
          </template>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-muted">{{ t('pricing.subtotal', orderItems.length) }}</span>
              <span>{{ $i18n.n(totalPriceItems, 'currency') }}</span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-muted">{{ t('pricing.shipping') }}</span>
              <span>{{ $i18n.n(shippingPrice, 'currency') }}</span>
            </div>

            <div
              v-if="(totalPriceExtra - shippingPrice || 0) > 0" class="
                flex items-center justify-between
              "
            >
              <span class="text-muted">{{ t('pricing.extras') }}</span>
              <span>{{ $i18n.n(totalPriceExtra - shippingPrice, 'currency') }}</span>
            </div>

            <USeparator />

            <div class="flex items-center justify-between text-lg font-semibold">
              <span class="text-highlighted">{{ t('pricing.total') }}</span>
              <span class="text-highlighted">{{ $i18n.n(paidAmount, 'currency') }}</span>
            </div>

            <div v-if="order?.paymentMethod" class="pt-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted">{{ t('payment.method') }}</span>
                <span>{{ order?.paymentMethod }}</span>
              </div>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="space-y-3">
            <UButton
              :to="localePath('index')"
              color="info"
              variant="subtle"
              size="lg"
              block
              icon="i-heroicons-home"
              :label="t('actions.home')"
            />

            <UButton
              v-if="trackingNumber"
              color="info"
              variant="outline"
              size="lg"
              block
              icon="i-heroicons-truck"
              :label="t('actions.track')"
            />
          </div>
        </UCard>
      </div>
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Η παραγγελία δημιουργήθηκε με επιτυχία
  main:
    title: Σε ευχαριστούμε, {customerName}!
    subtitle: Η παραγγελία σου δημιουργήθηκε επιτυχώς και θα λάβεις email επιβεβαίωσης σύντομα.
  order:
    number: Αριθμός Παραγγελίας
    items: Προϊόντα Παραγγελίας
    summary: Σύνοψη Παραγγελίας
    timeline: Ιστορικό Παραγγελίας
  customer:
    name: Όνομα Πελάτη
    email: Email
  verifying:
    payment: Επαλήθευση πληρωμής...
    description: Παρακαλώ περίμενε ενώ επιβεβαιώνουμε την πληρωμή σου.
  payment:
    status: Κατάσταση Πληρωμής
    paid: Πληρωμένη
    pending: Εκκρεμεί
    method: Τρόπος Πληρωμής
    completed:
      title: Η παραγγελία ολοκληρώθηκε
      description: Η παραγγελία σου επιβεβαιώθηκε και θα λάβεις email επιβεβαίωσης σύντομα.
  tracking:
    number: Αριθμός Παρακολούθησης
  shipping:
    carrier: Εταιρεία Αποστολής
  pricing:
    breakdown: Ανάλυση Κόστους
    subtotal: Κόστος Προϊόντος | Κόστος Προϊόντων
    shipping: Έξοδα Αποστολής
    extras: Επιπλέον Κόστη
    total: Σύνολο
  actions:
    cancel: Ακύρωση Παραγγελίας
    home: Πίσω στην Αρχική
    track: Παρακολούθηση Παραγγελίας
  image: Εικόνα
  product: Προϊόν
  quantity: Ποσότητα
  price:
    unit: Τιμή Μονάδας
    total: Συνολική Τιμή
  refunded: επιστράφηκε
</i18n>
