<script lang="ts" setup>
/**
 * One order, as the boards draw it: how far it has come, one timeline
 * of what happened to it — the store's own steps and the carrier's
 * scans, newest first — beside where it is going, then its items and
 * totals, the invoice details and the payment.
 *
 * No delivery estimate: Django has none to give (PLAN B5).
 */
const { t, n, locale } = useI18n()
const toast = useToast()
const route = useRoute(`account-orders-id___${locale.value}`)
const orderId = 'id' in route.params ? route.params.id : undefined

useHead({ title: () => t('title', { id: orderId }) })

const { data: order, refresh: refreshOrder } = await useApi<OrderDetail>(`/api/orders/${orderId}`, {
  key: `order${orderId}`,
  method: 'GET',
  query: { languageCode: locale },
})

const { cancelOrder } = useOrder()
const { reorder, reordering } = useReorder()
const { getPaymentMethodName } = usePaymentMethod()
const { presentationFor: boxNowPresentation } = useBoxNowParcelState()

const HISTORY_TITLE_KEYS: Record<string, string> = {
  CREATED: 'history.created',
  STATUS: 'history.status',
  PAYMENT: 'history.payment',
  SHIPPING: 'history.shipping',
  REFUND: 'history.refund',
}

interface TimelineEntry {
  key: string
  date: string
  title: string
  description: string
}

/**
 * The store's own steps (Django curates them: creation and the status,
 * payment, shipping and refund transitions) and the carrier's scans,
 * merged and newest first.
 */
const timeline = computed<TimelineEntry[]>(() => {
  const value = order.value
  if (!value) return []
  const history = (value.orderTimeline ?? [])
    .filter(entry => Boolean(entry.timestamp))
    .map((entry, index) => {
      const key = entry.changeType ? HISTORY_TITLE_KEYS[entry.changeType] : undefined
      return {
        key: `history-${index}`,
        date: entry.timestamp!,
        title: key ? t(key) : (entry.changeType ?? ''),
        description: entry.description ?? '',
      }
    })
  const boxNow = (value.boxnowShipment?.events ?? []).map((event, index) => ({
    key: `boxnow-${index}`,
    date: event.eventTime,
    title: boxNowPresentation(event.eventType).label,
    description: event.displayName || event.postalCode || '',
  }))
  const acs = (value.acsShipment?.events ?? []).map((event, index) => ({
    key: `acs-${index}`,
    date: event.eventTime,
    title: event.checkpointAction,
    description: event.checkpointLocation || event.notes || '',
  }))
  return [...history, ...boxNow, ...acs]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
})

/** Where the parcel is going: a locker, a station, or the address. */
const destination = computed(() => {
  const value = order.value
  if (!value) return null
  const locker = value.boxnowShipment?.locker
  if (locker) {
    return {
      kind: 'pickup' as const,
      name: `BOX NOW · ${locker.name}`,
      address: [locker.addressLine1, locker.postalCode].filter(Boolean).join(', '),
    }
  }
  const station = value.acsShipment?.station
  if (station) {
    return {
      kind: 'pickup' as const,
      name: `ACS · ${station.name}`,
      address: [station.addressLine1, station.postalCode].filter(Boolean).join(', '),
    }
  }
  return value.fullAddress
    ? { kind: 'address' as const, name: `${value.firstName} ${value.lastName}`, address: value.fullAddress }
    : null
})

/** The carrier's own tracking page, and the shipping label where there is one. */
const tracking = computed(() => {
  const value = order.value
  if (!value) return null
  const parcelId = value.boxnowShipment?.parcelId
  if (parcelId) {
    return {
      label: t('track', { carrier: 'BOX NOW' }),
      url: `https://boxnow.gr/en?track=${parcelId}`,
      labelUrl: `/api/orders/${value.id}/boxnow-label`,
    }
  }
  const voucher = value.acsShipment?.voucherNo
  if (voucher) {
    return {
      label: t('track', { carrier: 'ACS' }),
      url: `https://webapp.acscourier.net/track-shipment/${voucher}`,
      labelUrl: `/api/orders/${value.id}/acs-label`,
    }
  }
  const url = value.trackingDetails?.trackingUrl
  return url ? { label: t('track_generic'), url, labelUrl: null } : null
})

const totals = computed(() => {
  const breakdown = order.value?.pricingBreakdown
  if (!breakdown) return []
  const discounts = (breakdown.discount ?? 0) + (breakdown.loyaltyDiscount ?? 0) + (breakdown.giftCardAmount ?? 0)
  return [
    { key: 'subtotal', label: t('totals.subtotal'), value: n(breakdown.itemsSubtotal ?? 0, 'currency') },
    ...(discounts > 0 ? [{ key: 'discounts', label: t('totals.discounts'), value: `−${n(discounts, 'currency')}` }] : []),
    {
      key: 'delivery',
      label: t('totals.delivery'),
      value: breakdown.shippingCost ? n(breakdown.shippingCost, 'currency') : t('totals.free'),
    },
    ...(breakdown.paymentMethodFee ? [{ key: 'fee', label: t('totals.payment_fee'), value: n(breakdown.paymentMethodFee, 'currency') }] : []),
  ]
})

const paymentLabel = computed(() =>
  order.value?.payWayKey ? getPaymentMethodName(order.value.payWayKey) : '',
)

const alert = computed(() => {
  const value = order.value
  if (!value) return null
  if (value.status === 'CANCELED') {
    return {
      color: 'error' as const,
      icon: 'i-lucide-circle-x',
      title: t('alert.canceled'),
      description: value.cancellation?.reason?.trim() || t('alert.canceled_description'),
    }
  }
  // Cash on delivery owes its whole total until the courier collects
  // it: an unpaid remainder is news only for an online payment.
  const remaining = value.pricingBreakdown?.remainingAmount
  if (remaining && remaining > 0 && value.isOnlinePayment) {
    return {
      color: 'warning' as const,
      icon: 'i-lucide-credit-card',
      title: t('alert.payment_pending'),
      description: t('alert.payment_pending_description', { amount: n(remaining, 'currency') }),
    }
  }
  return null
})

const cancelOpen = ref(false)
const canceling = ref(false)

async function confirmCancel() {
  if (!order.value?.canBeCanceled || canceling.value) return
  canceling.value = true
  try {
    await cancelOrder(order.value.id)
    cancelOpen.value = false
    await refreshOrder()
    toast.add({ title: t('cancel.success'), color: 'success', icon: 'i-lucide-circle-check' })
  }
  catch (error) {
    const status = (error as { statusCode?: number })?.statusCode
    log.error({ action: 'order:cancel', status, error })
    // The order moved on since the page loaded (or someone else
    // canceled it): show its real state.
    const moved = status === 409 || status === 400
    toast.add({
      title: t('cancel.error_title'),
      description: moved ? t('cancel.error_moved') : t('cancel.error_description'),
      color: 'error',
      icon: 'i-lucide-circle-x',
    })
    if (moved) {
      cancelOpen.value = false
      await refreshOrder()
    }
  }
  finally {
    canceling.value = false
  }
}

const fetchingInvoice = ref(false)

async function openInvoice() {
  if (!order.value?.id || fetchingInvoice.value) return
  fetchingInvoice.value = true
  try {
    const data = await $api(`/api/orders/${order.value.id}/invoice`, { method: 'GET' })
    if (!data?.downloadUrl) {
      toast.add({ title: t('invoice.error_title'), description: t('invoice.error_missing'), color: 'error' })
      return
    }
    // A short-lived signed link: opened, not linked to.
    window.open(data.downloadUrl, '_blank', 'noopener,noreferrer')
  }
  catch (error) {
    log.error({ action: 'order:invoice:download', error })
    toast.add({ title: t('invoice.error_title'), description: t('invoice.error_description'), color: 'error' })
  }
  finally {
    fetchingInvoice.value = false
  }
}

const CARD = 'rounded-[1.25rem] bg-default p-6 ring ring-default'
</script>

<template>
  <div
    v-if="order"
    class="flex flex-col gap-5"
  >
    <AccountPageHeader :title="t('title', { id: order.id })">
      <template #lead>
        <i18n-t keypath="placed">
          <template #date>
            <NuxtTime
              :datetime="order.createdAt"
              :locale="locale"
              day="numeric"
              month="short"
              year="numeric"
            />
          </template>
          <template #time>
            <NuxtTime
              :datetime="order.createdAt"
              :locale="locale"
              hour="2-digit"
              minute="2-digit"
            />
          </template>
        </i18n-t>
      </template>
      <template #actions>
        <UButton
          v-if="order.hasInvoice"
          :label="t('invoice.cta')"
          :loading="fetchingInvoice"
          icon="i-lucide-download"
          color="neutral"
          variant="outline"
          size="sm"
          @click="openInvoice"
        />
        <UButton
          :label="t('reorder.cta')"
          :loading="reordering === order.id"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          size="sm"
          @click="() => reorder(order!.id)"
        />
        <UButton
          v-if="order.canBeCanceled"
          :label="t('cancel.cta')"
          color="error"
          variant="ghost"
          size="sm"
          @click="() => { cancelOpen = true }"
        />
      </template>
    </AccountPageHeader>

    <UAlert
      v-if="alert"
      :color="alert.color"
      :icon="alert.icon"
      :title="alert.title"
      :description="alert.description"
      variant="subtle"
    />

    <section
      :aria-label="t('progress')"
      class="flex flex-col gap-6"
      :class="CARD"
    >
      <OrderProgress
        :status="order.status"
        labels
      />
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <ol
          v-if="timeline.length"
          class="flex flex-col gap-5"
        >
          <li
            v-for="entry in timeline"
            :key="entry.key"
            class="relative flex gap-3"
          >
            <span
              class="mt-1.5 size-2.5 shrink-0 rounded-full bg-secondary"
              aria-hidden="true"
            />
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <p class="font-semibold text-highlighted">
                {{ entry.title }}
              </p>
              <p
                v-if="entry.description"
                class="text-sm text-toned"
              >
                {{ entry.description }}
              </p>
            </div>
            <NuxtTime
              :datetime="entry.date"
              :locale="locale"
              day="numeric"
              month="short"
              hour="2-digit"
              minute="2-digit"
              class="shrink-0 font-mono text-xs text-toned"
            />
          </li>
        </ol>
        <div
          v-if="destination || tracking"
          class="flex flex-col items-start gap-3"
        >
          <div
            v-if="destination"
            class="flex w-full flex-col gap-1 rounded-[0.875rem] bg-elevated p-4"
          >
            <p class="text-xs font-semibold tracking-[0.08em] text-toned uppercase">
              {{ t(destination.kind === 'pickup' ? 'pickup_point' : 'delivery_address') }}
            </p>
            <p class="font-semibold text-highlighted">
              {{ destination.name }}
            </p>
            <p class="text-sm text-toned">
              {{ destination.address }}
            </p>
          </div>
          <div
            v-if="tracking"
            class="flex flex-wrap gap-2"
          >
            <UButton
              :label="tracking.label"
              :to="tracking.url"
              target="_blank"
              rel="noopener noreferrer"
              icon="i-lucide-truck"
              color="neutral"
              variant="outline"
              size="sm"
            />
            <UButton
              v-if="tracking.labelUrl"
              :label="t('shipping_label')"
              :to="tracking.labelUrl"
              target="_blank"
              icon="i-lucide-download"
              color="neutral"
              variant="ghost"
              size="sm"
            />
          </div>
        </div>
      </div>
    </section>

    <section
      aria-labelledby="order-items-title"
      class="flex flex-col gap-4"
      :class="CARD"
    >
      <h2
        id="order-items-title"
        class="font-semibold text-highlighted"
      >
        {{ t('items') }}
      </h2>
      <ul class="flex flex-col divide-y divide-default">
        <li
          v-for="item in order.items"
          :key="item.id"
          class="flex items-center gap-4 py-3 first:pt-0"
        >
          <span class="size-14 shrink-0 overflow-hidden rounded-[0.875rem] bg-elevated">
            <ImgWithFallback
              :src="item.product.mainImagePath"
              alt=""
              :width="112"
              :height="112"
              fit="cover"
              loading="lazy"
              class="size-full object-cover"
            />
          </span>
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <p class="font-medium text-highlighted">
              {{ extractTranslated(item.product, 'name', locale) }}
            </p>
            <p class="text-sm text-toned">
              {{ t('quantity', { quantity: item.quantity ?? 0 }) }}
            </p>
          </div>
          <p class="font-mono font-semibold text-highlighted">
            {{ n(item.totalPrice, 'currency') }}
          </p>
        </li>
      </ul>
      <dl class="flex flex-col gap-2 border-t border-default pt-4">
        <div
          v-for="row in totals"
          :key="row.key"
          class="flex justify-between gap-4"
        >
          <dt class="text-toned">
            {{ row.label }}
          </dt>
          <dd class="font-mono text-highlighted">
            {{ row.value }}
          </dd>
        </div>
        <div class="flex justify-between gap-4 pt-1">
          <dt class="font-semibold text-highlighted">
            {{ order.isPaid ? t('totals.paid') : t('totals.total') }}
          </dt>
          <dd class="font-mono font-bold text-highlighted">
            {{ n(order.pricingBreakdown?.grandTotal ?? order.paidAmount, 'currency') }}
          </dd>
        </div>
      </dl>
    </section>

    <div class="grid gap-5 sm:grid-cols-2">
      <section
        v-if="order.documentType === 'INVOICE'"
        class="flex flex-col gap-2"
        :class="CARD"
      >
        <h2 class="text-xs font-semibold tracking-[0.08em] text-toned uppercase">
          {{ t('invoice.details') }}
        </h2>
        <p class="text-highlighted">
          {{ order.billingCompanyName }}
        </p>
        <p class="text-sm text-toned">
          {{ t('invoice.vat', { vat: order.billingVatId, office: order.billingTaxOffice }) }}
        </p>
        <p class="text-sm text-toned">
          {{ order.billingStreet }} {{ order.billingStreetNumber }}, {{ order.billingZipcode }} {{ order.billingCity }}
        </p>
      </section>
      <section
        class="flex flex-col items-start gap-2"
        :class="CARD"
      >
        <h2 class="text-xs font-semibold tracking-[0.08em] text-toned uppercase">
          {{ t('payment') }}
        </h2>
        <p
          v-if="paymentLabel"
          class="text-highlighted"
        >
          {{ paymentLabel }}
        </p>
        <UBadge
          v-if="order.paymentStatusDisplay"
          :label="order.paymentStatusDisplay"
          :color="order.isPaid ? 'success' : 'warning'"
          variant="soft"
        />
      </section>
      <section
        v-if="order.customerNotes"
        class="flex flex-col gap-2 sm:col-span-2"
        :class="CARD"
      >
        <h2 class="text-xs font-semibold tracking-[0.08em] text-toned uppercase">
          {{ t('notes') }}
        </h2>
        <p class="whitespace-pre-line text-highlighted">
          {{ order.customerNotes }}
        </p>
      </section>
    </div>

    <UModal
      v-model:open="cancelOpen"
      :title="t('cancel.confirm_title', { id: order.id })"
      :ui="{ ...DIALOG_UI,
             content: `
               ${DIALOG_UI.content}
               max-w-110
             ` }"
    >
      <template #body>
        <p class="text-toned">
          {{ t('cancel.confirm_body') }}
        </p>
      </template>
      <template #footer>
        <UButton
          :label="t('cancel.keep')"
          color="neutral"
          variant="outline"
          @click="() => { cancelOpen = false }"
        />
        <UButton
          :label="t('cancel.confirm')"
          :loading="canceling"
          color="error"
          @click="confirmCancel"
        />
      </template>
    </UModal>
  </div>
</template>

<i18n lang="yaml">
el:
  title: "Παραγγελία #{id}"
  placed: Καταχωρήθηκε {date} στις {time}
  progress: Πορεία της παραγγελίας
  history:
    created: Η παραγγελία καταχωρήθηκε
    status: Αλλαγή κατάστασης
    payment: Πληρωμή
    shipping: Αποστολή
    refund: Επιστροφή χρημάτων
  pickup_point: Σημείο παραλαβής
  delivery_address: Διεύθυνση αποστολής
  track: Παρακολούθηση στο {carrier}
  track_generic: Παρακολούθηση αποστολής
  shipping_label: Ετικέτα αποστολής
  items: Προϊόντα
  quantity: "Ποσ. {quantity}"
  totals:
    subtotal: Υποσύνολο
    discounts: Εκπτώσεις
    delivery: Μεταφορικά
    free: Δωρεάν
    payment_fee: Χρέωση τρόπου πληρωμής
    total: Σύνολο
    paid: Πληρώθηκαν
  payment: Πληρωμή
  notes: Σημειώσεις
  alert:
    canceled: Η παραγγελία ακυρώθηκε
    canceled_description: Αυτή η παραγγελία δεν θα σταλεί.
    payment_pending: Η πληρωμή εκκρεμεί
    payment_pending_description: Απομένουν {amount} για να ολοκληρωθεί η πληρωμή.
  invoice:
    cta: Τιμολόγιο
    details: Στοιχεία τιμολογίου
    vat: "ΑΦΜ {vat} · {office}"
    error_title: Το τιμολόγιο δεν άνοιξε
    error_description: Δοκίμασε ξανά σε λίγο.
    error_missing: Το τιμολόγιο δεν είναι ακόμα διαθέσιμο.
  cancel:
    cta: Ακύρωση παραγγελίας
    confirm_title: "Ακύρωση της παραγγελίας #{id};"
    confirm_body: Η παραγγελία δεν θα σταλεί. Η ακύρωση δεν αναιρείται.
    keep: Όχι, κράτησέ τη
    confirm: Ναι, ακύρωσέ τη
    success: Η παραγγελία ακυρώθηκε
    error_title: Η παραγγελία δεν ακυρώθηκε
    error_description: Κάτι πήγε στραβά. Δοκίμασε ξανά.
    error_moved: Η παραγγελία προχώρησε και δεν ακυρώνεται πια.
en:
  title: "Order #{id}"
  placed: Placed {date} at {time}
  progress: Order progress
  history:
    created: Order placed
    status: Status change
    payment: Payment
    shipping: Shipping
    refund: Refund
  pickup_point: Pickup point
  delivery_address: Delivery address
  track: Track on {carrier}
  track_generic: Track the parcel
  shipping_label: Shipping label
  items: Items
  quantity: "Qty {quantity}"
  totals:
    subtotal: Subtotal
    discounts: Discounts
    delivery: Delivery
    free: Free
    payment_fee: Payment method fee
    total: Total
    paid: Paid
  payment: Payment
  notes: Notes
  alert:
    canceled: This order was canceled
    canceled_description: This order will not be shipped.
    payment_pending: Payment pending
    payment_pending_description: "{amount} is still due to complete the payment."
  invoice:
    cta: Invoice
    details: Invoice details
    vat: "VAT {vat} · {office}"
    error_title: The invoice did not open
    error_description: Please try again in a moment.
    error_missing: The invoice is not available yet.
  cancel:
    cta: Cancel order
    confirm_title: "Cancel order #{id}?"
    confirm_body: The order will not be shipped. Canceling cannot be undone.
    keep: No, keep it
    confirm: Yes, cancel it
    success: Order canceled
    error_title: The order was not canceled
    error_description: Something went wrong. Please try again.
    error_moved: The order has moved on and can no longer be canceled.
</i18n>
