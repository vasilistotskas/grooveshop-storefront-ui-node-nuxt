<script lang="ts" setup>
/**
 * The order confirmation, as the boards draw it: a thank-you with the
 * order number and where the receipt went, the payment's state while the
 * provider confirms it, what happens next, the order's summary and the
 * ways on — the order page, more shopping, the invoice — then a few of
 * the store's guides while the parcel is on its way.
 *
 * The last step carries the order's `estimatedDelivery` (a date Django
 * fixed at placement) while the order is still on its way. The webside
 * webside tree keeps its own copy of this page.
 */
const { t, n, locale } = useStoreI18n('components/Storefront/CheckoutSuccess')

// The order-confirmation page shipped with the document title left at
// the store name, twice — on the one page a customer is most likely to
// keep open in a tab, or come back to from history.
useHead({ title: () => t('title') })
const { loggedIn } = useUserSession()
const toast = useToast()
const localePath = useLocalePath()

const {
  orderUUID,
  order,
  orderItems,
  paymentStatus,
  isPaid,
  isCollectedOnDelivery,
  paymentMethodLabel,
  amountDue,
  fromCheckout,
  sessionVerified,
  verifyingSession,
  recommendedPostsList,
} = await useCheckoutSuccess({ guideCount: 3 })

/**
 * What the payment did, said only to a shopper arriving from checkout,
 * and only once the provider's answer is in: a direct revisit claims no
 * state it has not just checked.
 */
type PaymentState = 'verifying' | 'completed' | 'failed' | 'on_delivery' | 'processing'

const FAILED_PAYMENT_STATUSES = ['failed', 'canceled']

const paymentState = computed<PaymentState | null>(() => {
  if (!fromCheckout.value) return null
  if (verifyingSession.value) return 'verifying'
  if (!sessionVerified.value) return null
  if (isPaid.value) return 'completed'
  if (FAILED_PAYMENT_STATUSES.includes(paymentStatus.value.toLowerCase())) return 'failed'
  // Checked BEFORE "processing": a collect-on-delivery order is not
  // awaiting a confirmation at all. It stays PENDING by design until the
  // carrier remits (measured ACS lag ~4 days), so the amber "payment is
  // processing" would sit there for days about an order nobody has been
  // asked to pay for yet.
  if (isCollectedOnDelivery.value) return 'on_delivery'
  return 'processing'
})

const PAYMENT_ALERT = {
  verifying: { color: 'info', icon: 'i-lucide-refresh-cw', class: undefined },
  completed: { color: 'success', icon: 'i-lucide-check', class: undefined },
  failed: { color: 'error', icon: 'i-lucide-triangle-alert', class: undefined },
  // The board's lime: the order is in, nothing is wrong, money comes later.
  on_delivery: { color: 'neutral', icon: 'i-lucide-banknote', class: 'bg-(--ui-volt-soft) text-highlighted' },
  processing: { color: 'warning', icon: 'i-lucide-clock', class: undefined },
} as const

const paymentAlert = computed(() => {
  const state = paymentState.value
  if (!state) return null
  return {
    ...PAYMENT_ALERT[state],
    title: t(state === 'verifying' ? 'verifying.payment' : `payment.${state}.title`),
    description: state === 'verifying'
      ? t('verifying.description')
      : state === 'on_delivery'
        ? t('payment.on_delivery.description', { amount: n(amountDue.value, 'currency') })
        : t(`payment.${state}.description`),
  }
})

/** Where the parcel goes: a locker or a station is collected, an address delivered to. */
const pickup = computed(() => Boolean(order.value?.boxnowShipment?.locker || order.value?.acsShipment?.station))

const CARRIERS: Record<string, string> = { acs: 'ACS', boxnow: 'BOX NOW' }
const carrier = computed(() => {
  const code = order.value?.shipmentProviderCode
  return (code && CARRIERS[code]) || order.value?.trackingDetails?.shippingCarrier || ''
})

/**
 * What happens next, from the order's status (`ORDER_FLOW`). A
 * collect-on-delivery order is paid on its last step, so it has no
 * payment step of its own; every other order's payment comes before it
 * is prepared. Each step is done once the order has passed it.
 */
const steps = computed(() => {
  const reached = orderStepsReached(order.value?.status)
  const collected = isCollectedOnDelivery.value
  return [
    { value: 'received', done: true, description: '' },
    ...(collected ? [] : [{ value: 'payment', done: isPaid.value, description: paymentMethodLabel.value }]),
    { value: 'preparing', done: reached >= 3, description: '' },
    { value: 'shipped', done: reached >= 3, description: carrier.value },
    {
      value: pickup.value ? 'ready_for_pickup' : 'delivered',
      done: reached >= 4,
      description: collected ? t('steps.pay_there', { amount: n(amountDue.value, 'currency') }) : '',
      estimate: awaitsDelivery(order.value?.status) ? order.value?.trackingDetails?.estimatedDelivery : null,
    },
  ]
})

const timeline = computed(() => steps.value.map(step => ({
  value: step.value,
  title: t(`steps.${step.value}`),
  description: step.description,
  estimate: 'estimate' in step ? step.estimate : null,
  icon: step.done ? 'i-lucide-check' : undefined,
})))

/** The last step done: UTimeline marks it and every step before it. */
const lastDone = computed(() => steps.value.findLastIndex(step => step.done))

const totals = computed(() => {
  const breakdown = order.value?.pricingBreakdown
  if (!breakdown) return []
  const discounts = (breakdown.discount ?? 0) + (breakdown.loyaltyDiscount ?? 0)
  // A gift card pays part of the order: its own line, not a discount.
  const giftCard = breakdown.giftCardAmount ?? 0
  return [
    ...(discounts > 0 ? [{ key: 'discounts', label: t('totals.discounts'), value: `−${n(discounts, 'currency')}`, saving: true }] : []),
    ...(giftCard > 0 ? [{ key: 'gift_card', label: t('totals.gift_card'), value: `−${n(giftCard, 'currency')}`, saving: true }] : []),
    {
      key: 'delivery',
      label: t('totals.delivery'),
      value: breakdown.shippingCost ? n(breakdown.shippingCost, 'currency') : t('totals.free'),
      saving: false,
    },
    ...(breakdown.paymentMethodFee
      ? [{ key: 'fee', label: t('totals.payment_fee'), value: n(breakdown.paymentMethodFee, 'currency'), saving: false }]
      : []),
  ]
})

const nameOf = (item: OrderItemDetail) => extractTranslated(item.product, 'name', locale.value) ?? ''

const { fetching: fetchingInvoice, open: openOrderInvoice } = useOrderInvoice()
const { notify } = useApiError()

async function openInvoice() {
  if (!order.value?.id) return
  const outcome = await openOrderInvoice(order.value.id, orderUUID)
  if (outcome.kind === 'missing') {
    toast.add({ title: t('invoice.error_title'), description: t('invoice.error_missing'), color: 'error' })
  }
  else if (outcome.kind === 'failed') {
    notify('checkout-success:invoice', outcome.error, { title: t('invoice.error_title'), fallback: t('invoice.error_description') })
  }
}
</script>

<template>
  <div
    v-if="order"
    class="flex flex-col"
  >
    <UContainer class="py-8 lg:py-12">
      <div class="mx-auto flex max-w-3xl flex-col gap-8 rounded-[1.25rem] bg-default p-6 ring ring-default sm:p-8">
        <div class="flex flex-col gap-4">
          <span class="grid size-14 place-items-center rounded-2xl bg-volt text-on-volt">
            <UIcon
              name="i-lucide-check"
              class="size-7"
            />
          </span>
          <h1 class="font-display text-3xl font-bold text-balance text-highlighted sm:text-4xl">
            {{ order.firstName ? t('heading', { name: order.firstName }) : t('heading_anonymous') }}
          </h1>
          <i18n-t
            keypath="lead"
            tag="p"
            class="text-toned"
          >
            <template #number>
              <strong class="font-mono text-highlighted">#{{ order.id }}</strong>
            </template>
            <template #email>
              <span class="break-all">{{ order.email }}</span>
            </template>
          </i18n-t>
        </div>

        <UAlert
          v-if="paymentAlert"
          :title="paymentAlert.title"
          :description="paymentAlert.description"
          :icon="paymentAlert.icon"
          :color="paymentAlert.color"
          :class="paymentAlert.class"
          :ui="paymentState === 'verifying' ? { icon: 'motion-safe:animate-spin' } : undefined"
          variant="soft"
          role="status"
        />

        <div class="grid gap-8 md:grid-cols-2">
          <section aria-labelledby="success-next">
            <h2
              id="success-next"
              class="mb-4 font-display text-xl font-bold text-highlighted"
            >
              {{ t('next') }}
            </h2>
            <UTimeline
              :items="timeline"
              :model-value="timeline[lastDone]?.value"
              color="secondary"
              size="xs"
            >
              <template #description="{ item }">
                <NuxtTime
                  v-if="item.value === 'received'"
                  :datetime="order.createdAt"
                  :locale="locale"
                  day="numeric"
                  month="short"
                  hour="2-digit"
                  minute="2-digit"
                />
                <template v-else>
                  {{ item.description }}
                  <i18n-t
                    v-if="item.estimate"
                    keypath="steps.estimated"
                    tag="span"
                    class="block"
                  >
                    <template #date>
                      <NuxtTime
                        :datetime="item.estimate"
                        :locale="locale"
                        time-zone="UTC"
                        weekday="short"
                        day="numeric"
                        month="short"
                      />
                    </template>
                  </i18n-t>
                </template>
              </template>
            </UTimeline>
          </section>

          <section aria-labelledby="success-summary">
            <h2
              id="success-summary"
              class="mb-4 font-display text-xl font-bold text-highlighted"
            >
              {{ t('summary') }}
            </h2>
            <ul class="flex flex-col gap-3">
              <li
                v-for="item in orderItems"
                :key="item.id"
                class="flex items-center gap-3 text-sm"
              >
                <ImgWithFallback
                  :src="item.product?.mainImagePath"
                  :alt="nameOf(item)"
                  :width="48"
                  :height="48"
                  fit="cover"
                  loading="lazy"
                  densities="x1 x2"
                  class="size-12 shrink-0 rounded-[0.625rem] bg-elevated object-cover"
                />
                <span class="min-w-0 flex-1 text-highlighted">{{ t('line', { quantity: item.quantity, name: nameOf(item) }) }}</span>
                <span class="shrink-0 font-mono font-bold text-highlighted">{{ n(item.totalPrice || 0, 'currency') }}</span>
              </li>
            </ul>
            <dl class="mt-4 flex flex-col gap-2.5 border-t border-default pt-4 text-sm">
              <div
                v-for="row in totals"
                :key="row.key"
                :class="['flex justify-between gap-3', row.saving && 'text-success']"
              >
                <dt :class="!row.saving && 'text-toned'">
                  {{ row.label }}
                </dt>
                <dd :class="['font-mono', !row.saving && 'text-highlighted']">
                  {{ row.value }}
                </dd>
              </div>
              <div class="flex items-baseline justify-between gap-3 pt-1">
                <dt class="font-semibold text-highlighted">
                  {{ isPaid ? t('totals.paid') : t('totals.total') }}
                </dt>
                <dd class="font-mono text-lg font-bold text-highlighted">
                  {{ n(amountDue, 'currency') }}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <UButton
            v-if="loggedIn"
            :label="t('actions.track')"
            :to="localePath({ name: 'account-orders-id', params: { id: order.id } })"
            color="neutral"
            size="lg"
          />
          <UButton
            :label="t('actions.continue')"
            :to="localePath('products')"
            color="neutral"
            variant="outline"
            size="lg"
          />
          <UButton
            v-if="order.hasInvoice"
            :label="t('actions.invoice')"
            :loading="fetchingInvoice"
            icon="i-lucide-download"
            color="neutral"
            variant="ghost"
            size="lg"
            @click="openInvoice"
          />
          <OrderSpecimenButton
            v-if="order.hasSpecimenReceipt"
            :order-id="order.id"
            :uuid="orderUUID"
            variant="ghost"
            size="lg"
          />
        </div>
      </div>
    </UContainer>

    <section
      v-if="recommendedPostsList.length"
      aria-labelledby="success-guides"
      class="border-t border-default bg-default py-12 lg:py-16"
    >
      <UContainer class="flex flex-col gap-6">
        <div class="flex flex-col gap-1">
          <h2
            id="success-guides"
            class="font-display text-3xl font-bold text-highlighted"
          >
            {{ t('guides.title') }}
          </h2>
          <p class="text-toned">
            {{ t('guides.lead') }}
          </p>
        </div>
        <ul class="grid gap-6 sm:grid-cols-3">
          <BlogPostCard
            v-for="post in recommendedPostsList"
            :key="post.id"
            :post="post"
            heading-level="h3"
            :show-share-button="false"
          />
        </ul>
      </UContainer>
    </section>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Η παραγγελία καταχωρήθηκε
  heading: Ευχαριστούμε, {name}. Η παραγγελία σου καταχωρήθηκε.
  heading_anonymous: Ευχαριστούμε. Η παραγγελία σου καταχωρήθηκε.
  lead: "Παραγγελία {number} · στείλαμε την επιβεβαίωση της παραγγελίας στο {email}."
  verifying:
    payment: Επαλήθευση πληρωμής...
    description: Παρακαλώ περίμενε ενώ επιβεβαιώνουμε την πληρωμή σου.
  payment:
    completed:
      title: Η πληρωμή ολοκληρώθηκε
      description: Η πληρωμή σου επιβεβαιώθηκε και θα λάβεις email επιβεβαίωσης σύντομα.
    failed:
      title: Η πληρωμή απέτυχε
      description: Δεν έγινε καμία χρέωση. Η παραγγελία καταχωρήθηκε απλήρωτη — επικοινώνησε μαζί μας για να την ολοκληρώσεις.
    processing:
      title: Η πληρωμή επεξεργάζεται
      description: Η παραγγελία σου καταχωρήθηκε. Η επιβεβαίωση πληρωμής μπορεί να καθυστερήσει λίγα λεπτά.
    on_delivery:
      title: Η παραγγελία σου καταχωρήθηκε
      description: "Θα πληρώσεις κατά την παραλαβή. Ποσό προς πληρωμή: {amount}."
  next: Τι ακολουθεί
  steps:
    received: Η παραγγελία καταχωρήθηκε
    payment: Επιβεβαίωση πληρωμής
    preparing: Προετοιμασία
    shipped: Αποστολή
    delivered: Παράδοση
    ready_for_pickup: Έτοιμη για παραλαβή
    pay_there: "Πληρωμή {amount} κατά την παραλαβή"
    estimated: "Εκτιμώμενη: {date}"
  summary: Σύνοψη
  line: "{quantity} × {name}"
  totals:
    discounts: Εκπτώσεις
    gift_card: Δωροκάρτα
    delivery: Αποστολή
    free: Δωρεάν
    payment_fee: Χρέωση τρόπου πληρωμής
    paid: Πληρώθηκε
    total: Σύνολο
  actions:
    track: Παρακολούθηση παραγγελίας
    continue: Συνέχεια αγορών
    invoice: Απόδειξη (PDF)
  invoice:
    error_title: Η απόδειξη δεν άνοιξε
    error_missing: Η απόδειξη δεν είναι ακόμη έτοιμη. Δοκίμασε ξανά σε λίγο.
    error_description: Κάτι πήγε στραβά. Δοκίμασε ξανά.
  guides:
    title: Μέχρι να φτάσει
    lead: Άρθρα από το blog μας.
en:
  title: Your order is in
  heading: Thank you, {name}. Your order is in.
  heading_anonymous: Thank you. Your order is in.
  lead: "Order {number} · we emailed the order confirmation to {email}."
  verifying:
    payment: Verifying payment…
    description: Please wait while we confirm your payment.
  payment:
    completed:
      title: Payment complete
      description: Your payment is confirmed and a confirmation email is on its way.
    failed:
      title: Payment failed
      description: Nothing was charged. The order is registered unpaid — contact us to complete it.
    processing:
      title: Payment is processing
      description: Your order is registered. Confirming the payment can take a few minutes.
    on_delivery:
      title: Your order is registered
      description: "You will pay on delivery. Amount due: {amount}."
  next: What happens next
  steps:
    received: Order received
    payment: Payment confirmed
    preparing: Preparing
    shipped: Shipped
    delivered: Delivered
    ready_for_pickup: Ready for pickup
    pay_there: "Pay {amount} on delivery"
    estimated: "Estimated {date}"
  summary: Summary
  line: "{quantity} × {name}"
  totals:
    discounts: Discounts
    gift_card: Gift card
    delivery: Delivery
    free: Free
    payment_fee: Payment method fee
    paid: Paid
    total: Total
  actions:
    track: Track order
    continue: Continue shopping
    invoice: Receipt (PDF)
  invoice:
    error_title: The receipt did not open
    error_missing: The receipt is not ready yet. Try again shortly.
    error_description: Something went wrong. Try again.
  guides:
    title: While you wait
    lead: Reads from our blog.
</i18n>
