<script lang="ts" setup>
import type { TableColumn } from '#ui/types'

const UAvatar = resolveComponent('UAvatar')

const { t, locale } = useStoreI18n('components/variants/webside/Storefront/CheckoutSuccess')
const { $i18n } = useNuxtApp()
const localePath = useLocalePath()
const img = useMediaStreamImage()

const getImage = (mainImagePath: string) => {
  return img(mainImagePath, { width: 96, height: 96, fit: 'cover' }, {
    provider: 'mediaStream',
  })
}

const {
  order,
  orderNumber,
  orderItems,
  paymentStatus,
  isPaid,
  isCollectedOnDelivery,
  paymentMethodLabel,
  amountDue,
  shippingPrice,
  fromCheckout,
  sessionVerified,
  verifyingSession,
  recommendedPostsList,
} = await useCheckoutSuccess({ guideCount: 8 })

const customerName = computed(() => {
  const firstName = order.value?.firstName
  const lastName = order.value?.lastName
  return `${firstName} ${lastName}`
})

const customerEmail = computed(() => order.value?.email)
const totalPriceItems = computed(() => order.value?.totalPriceItems || 0)
const totalPriceExtra = computed(() => order.value?.totalPriceExtra || 0)
const discountAmount = computed(() => order.value?.discountAmount || 0)
const loyaltyDiscountAmount = computed(() => order.value?.loyaltyDiscount || 0)
const giftCardAmount = computed(() => order.value?.giftCardAmount || 0)

const trackingNumber = computed(() => order.value?.trackingNumber)
const shippingCarrier = computed(() => order.value?.shippingCarrier)

const openTracking = () => {
  if (!trackingNumber.value) return
  const query = shippingCarrier.value
    ? `${shippingCarrier.value} ${trackingNumber.value} tracking`
    : `${trackingNumber.value} tracking`
  window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer')
}

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

const getPaymentStatusLabel = (status: OrderDetail['paymentStatus']) => {
  const labels: Record<string, string> = {
    pending: t('payment.status_label.pending'),
    processing: t('payment.status_label.processing'),
    completed: t('payment.status_label.completed'),
    failed: t('payment.status_label.failed'),
    refunded: t('payment.status_label.refunded'),
    partially_refunded: t('payment.status_label.partially_refunded'),
    canceled: t('payment.status_label.canceled'),
  }
  if (!status) return t('payment.pending')
  return labels[status.toLowerCase()] || status
}

const orderItemColumns: TableColumn<OrderItemDetail>[] = [
  {
    accessorKey: 'product.mainImagePath',
    header: t('image'),
    cell: ({ row }) => {
      const item = row.original
      return h(UAvatar, {
        src: getImage(item.product?.mainImagePath),
        alt: `${extractTranslated(item.product, 'name', locale.value)} ${t('image')}`,
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
</script>

<template>
  <WebsidePageWrapper
    class="
      flex flex-col gap-6
      md:gap-8
    "
  >
    <WebsidePageTitle
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
      v-else-if="fromCheckout && sessionVerified && isPaid"
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

    <!-- Collect-on-delivery is checked BEFORE the generic "not paid
         yet" branch below, because such an order is not awaiting a
         payment confirmation at all — nothing is processing. It stays
         PENDING by design until the carrier remits (measured ACS lag
         ~4 days), so the amber warning below would sit on the page for
         days telling the shopper their payment might be delayed, for
         an order they have not been asked to pay for yet. -->
    <UAlert
      v-else-if="fromCheckout && sessionVerified && !isPaid && isCollectedOnDelivery"
      color="success"
      variant="subtle"
      icon="i-heroicons-banknotes"
      class="mx-auto max-w-2xl"
    >
      <template #title>
        {{ t('payment.on_delivery.title') }}
      </template>
      <template #description>
        {{ t('payment.on_delivery.description', { amount: $i18n.n(amountDue, 'currency') }) }}
      </template>
    </UAlert>

    <UAlert
      v-else-if="fromCheckout && sessionVerified && !isPaid"
      color="warning"
      variant="subtle"
      icon="i-heroicons-clock"
      class="mx-auto max-w-2xl"
    >
      <template #title>
        {{ t('payment.processing.title') }}
      </template>
      <template #description>
        {{ t('payment.processing.description') }}
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
                {{ getPaymentStatusLabel(paymentStatus) }}
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

            <div
              v-if="discountAmount > 0"
              class="flex items-center justify-between text-success"
            >
              <span>{{ t('pricing.discount') }}</span>
              <span>-{{ $i18n.n(discountAmount, 'currency') }}</span>
            </div>

            <div
              v-if="loyaltyDiscountAmount > 0"
              class="flex items-center justify-between text-success"
            >
              <span>{{ t('pricing.loyalty_discount') }}</span>
              <span>-{{ $i18n.n(loyaltyDiscountAmount, 'currency') }}</span>
            </div>

            <div
              v-if="giftCardAmount > 0"
              class="flex items-center justify-between text-success"
            >
              <span>{{ t('pricing.gift_card') }}</span>
              <span>-{{ $i18n.n(giftCardAmount, 'currency') }}</span>
            </div>

            <USeparator />

            <div class="flex items-center justify-between text-lg font-semibold">
              <span class="text-highlighted">{{ t('pricing.total') }}</span>
              <span class="text-highlighted">{{ $i18n.n(amountDue, 'currency') }}</span>
            </div>

            <div v-if="paymentMethodLabel" class="pt-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted">{{ t('payment.method') }}</span>
                <span>{{ paymentMethodLabel }}</span>
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
              @click="openTracking"
            />
          </div>
        </UCard>
      </div>
    </div>

    <section
      v-if="recommendedPostsList.length"
      class="
        mt-12
        md:mt-16
      "
      :aria-label="t('recommended.title')"
    >
      <h2
        class="
          mb-6 text-center text-balance text-2xl font-bold text-primary-950
          md:text-3xl
          dark:text-primary-50
        "
      >
        {{ t('recommended.title') }}
      </h2>
      <LazyWebsideBlogPostsCarousel :posts="recommendedPostsList" />
    </section>
  </WebsidePageWrapper>
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
    status_label:
      pending: Εκκρεμεί
      processing: Σε επεξεργασία
      completed: Ολοκληρώθηκε
      failed: Απέτυχε
      refunded: Επεστράφη
      partially_refunded: Μερική επιστροφή
      canceled: Ακυρώθηκε
    completed:
      title: Η πληρωμή ολοκληρώθηκε
      description: Η πληρωμή σου επιβεβαιώθηκε και θα λάβεις email επιβεβαίωσης σύντομα.
    processing:
      title: Η πληρωμή επεξεργάζεται
      description: Η παραγγελία σου καταχωρήθηκε. Η επιβεβαίωση πληρωμής μπορεί να καθυστερήσει λίγα λεπτά.
    on_delivery:
      title: Η παραγγελία σου καταχωρήθηκε
      description: "Θα πληρώσεις κατά την παραλαβή. Ποσό προς πληρωμή: {amount}."
  tracking:
    number: Αριθμός Παρακολούθησης
  shipping:
    carrier: Εταιρεία Αποστολής
  pricing:
    breakdown: Ανάλυση Κόστους
    subtotal: Κόστος Προϊόντος | Κόστος Προϊόντων
    shipping: Έξοδα Αποστολής
    extras: Επιπλέον Κόστη
    discount: Έκπτωση προσφοράς
    loyalty_discount: Έκπτωση πόντων
    gift_card: Δωροκάρτα
    total: Σύνολο
  actions:
    cancel: Ακύρωση Παραγγελίας
    home: Πίσω στην Αρχική
    track: Παρακολούθηση Παραγγελίας
  recommended:
    title: Μέχρι να έρθει η παραγγελία σου, ρίξε μια ματιά στα άρθρα μας
  image: Εικόνα
  product: Προϊόν
  quantity: Ποσότητα
  price:
    unit: Τιμή Μονάδας
    total: Συνολική Τιμή
  refunded: επιστράφηκε
</i18n>
