<script lang="ts" setup>
/**
 * The order confirmation, as the boards draw it: a thank-you with the
 * order number and where the receipt went, the payment's state while the
 * provider confirms it, what happens next, the order's summary and the
 * ways on — the order page, more shopping, the invoice — then a few of
 * the store's guides while the parcel is on its way.
 *
 * No delivery dates in "what happens next": Django has none to give
 * (PLAN B5). The frozen webside tree keeps its own copy of this page.
 */
const { t, n, locale } = useI18n()

// The order-confirmation page shipped with the document title left at
// the store name, twice — on the one page a customer is most likely to
// keep open in a tab, or come back to from history.
useHead({ title: () => t('title') })
const tenantStore = useTenantStore()
const { loggedIn } = useUserSession()
const toast = useToast()
const route = useRoute(`checkout-success-uuid___${locale.value}`)
const orderUUID = 'uuid' in route.params ? route.params.uuid : undefined

if (!orderUUID || typeof orderUUID !== 'string') {
  throw createError({ statusCode: 404, statusMessage: 'Missing order UUID' })
}

const sessionId = computed(() => route.query.session_id as string | undefined)
const vivaOrderCode = computed(() => route.query.s as string | undefined)
const fromViva = computed(() => !!vivaOrderCode.value)
// Offline pay-ways (COD) navigate here with ``?placed=1`` — there is no
// provider redirect param to key on, but the purchase pixels (Meta +
// GA4) and the cart cleanup still need the "arrived via a real
// checkout" signal. Unlike the online params it must NOT trigger the
// payment-status polling below: a COD order is legitimately unpaid.
const placedOffline = computed(() => route.query.placed === '1')
const fromCheckout = computed(
  () => !!sessionId.value || fromViva.value || placedOffline.value,
)
const sessionVerified = ref(false)
const verifyingSession = ref(false)
const pollAttempt = ref(0)
const isActive = ref(true)

const localePath = useLocalePath()

const cartStore = useCartStore()
const { cleanCartState } = cartStore

const { data: order, error } = await useApi(
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

const orderNumber = computed(() => order.value?.id)
const orderItems = computed(() => order.value?.items || [])

const paymentStatus = computed(() => order.value?.paymentStatus || '')
const isPaid = computed(() => order.value?.isPaid || false)

// The carrier collects this order's money on delivery — courier
// cash-on-delivery, or a card at a BoxNow locker terminal.
//
// Not `!isOnlinePayment`: that is also true of bank transfer, where the
// shopper owes us directly and "you'll pay on delivery" would be wrong.
// The distinction is computed on the server from the pay-way's
// settlement, so the storefront holds no rule of its own.
const isCollectedOnDelivery = computed(
  () => order.value?.isCollectedOnDelivery || false,
)

// The shopper's chosen method, resolved through the same
// `payment_methods.*` map the checkout list uses. NOT
// `order.paymentMethod` — that is the gateway code a payment handler
// writes (`acs_cod`, `viva_wallet`), so this line read "acs_cod" to
// real customers, and stayed blank on a COD order until the courier
// remitted days later.
const { getPaymentMethodName } = usePaymentMethod()

const paymentMethodLabel = computed(() =>
  order.value?.payWayKey ? getPaymentMethodName(order.value.payWayKey) : '',
)

const paidAmount = computed(() => order.value?.paidAmount || 0)
const shippingPrice = computed(() => order.value?.shippingPrice || 0)

// Only fetch + show the store's guides when the tenant has the blog
// feature enabled — a blog-disabled store must not fire the blog API or
// render the band on its success page.
// useLazyAsyncData still executes during SSR (`lazy` only defers on
// client navigation), so this needs the request-bound fetch: a bare
// $fetch loses the tenant host and 404s, silently emptying the band.
const requestFetch = useRequestApi()
const { data: recommendedPosts } = useLazyAsyncData(
  `success-recommended-posts:${locale.value}`,
  () => tenantStore.blogEnabled
    ? requestFetch('/api/blog/posts', {
        query: {
          languageCode: locale.value,
          paginationType: 'pageNumber',
          pageSize: 3,
          ordering: '-featured,-publishedAt',
        },
      })
    : Promise.resolve(null),
  { default: () => null },
)
const recommendedPostsList = computed(() =>
  tenantStore.blogEnabled ? (recommendedPosts.value?.results ?? []) : [],
)

onBeforeUnmount(() => {
  isActive.value = false
})

// Meta Pixel — Purchase event. The success page is the canonical
// browser-side firing point for Purchase. We reuse the event_id the
// Django side stored on ``order.metaEventIds.purchase`` at order
// creation so Meta dedups this against the server-side Conversions
// API event for the same order. ``onMounted`` ensures we never fire
// during prerender / SSR. The watcher is keyed on ``orderNumber``
// to handle the live re-fetch flow (Stripe webhook flips status
// after a 2s poll); pixel must NOT fire twice for the same order, so
// a guard ref tracks whether we already sent it.
// Capture once at setup so the watcher / onMounted callback don't
// re-invoke ``useScript*`` from outside setup context.
const metaPixel = useMetaPixel()
const tiktokPixel = useTikTokPixel()
const openaiPixel = useOpenAIPixel()
const ga4 = useGA4()
const googleAds = useGoogleAds()
const purchaseEventFired = ref(false)
function tryFirePurchaseEvent() {
  if (!order.value || purchaseEventFired.value) return
  // Purchase is only meaningful when the customer landed here via a
  // real checkout flow (not a deep-link to /checkout/success/<uuid>
  // from history). Gate on ``fromCheckout`` so direct revisits don't
  // re-fire the event.
  if (!fromCheckout.value) return
  // Only fire after the Django side has minted an event_id (i.e.
  // ``meta_event_ids.purchase`` exists). Without it the dedup pair
  // is broken — better to skip the browser leg than double-count.
  const eventId = order.value.metaEventIds?.purchase
  if (!eventId) return

  try {
    // ``order.currency`` is a SerializerMethodField that walks the
    // order's djmoney fields (paid_amount → total_price_items →
    // shipping_price) and returns an ISO 4217 code. Defaulting to
    // 'EUR' here is just paranoia — the field is always populated
    // server-side per the project's monetary defaults.
    const currency = order.value.currency ?? 'EUR'
    const value = Number(paidAmount.value ?? 0)
    const transactionId = String(order.value.id)

    metaPixel.trackPurchase(
      {
        currency,
        value,
        orderId: transactionId,
        contentType: 'product',
        contentIds: orderItems.value
          .map(item => item.product?.id)
          .filter(
            (id): id is number => typeof id === 'number',
          )
          .map(id => String(id)),
        contents: orderItems.value.map(item => ({
          id: String(item.product?.id ?? ''),
          quantity: Number(item.quantity ?? 0),
          itemPrice: Number(item.price ?? 0),
        })),
        numItems: orderItems.value.reduce(
          (acc, item) => acc + Number(item.quantity ?? 0),
          0,
        ),
      },
      { eventID: eventId },
    )

    // TikTok: CompletePayment — TikTok's web purchase event
    // (``Purchase`` is a separate offline/shop event). Browser-only,
    // no server-side Events API leg, so no event_id dedup; the
    // ``purchaseEventFired`` guard + ``fromCheckout`` gate above
    // prevent re-fires.
    // OpenAI calls a completed purchase ``order_created``. The names
    // are NOT interchangeable across providers — TikTok's ``Purchase``
    // is a separate offline event, hence ``CompletePayment`` below,
    // and Meta's is ``Purchase`` again. Each wrapper is named after
    // its own vendor's taxonomy so they cannot be confused.
    openaiPixel.trackOrderCreated({
      currency,
      amount: value,
      contents: orderItems.value
        .filter(item => typeof item.product?.id === 'number')
        .map(item => ({
          id: String(item.product!.id),
          contentType: 'product',
          quantity: Number(item.quantity ?? 0),
        })),
    })

    tiktokPixel.trackCompletePayment({
      currency,
      value,
      orderId: transactionId,
      contentType: 'product',
      contents: orderItems.value.map(item => ({
        contentId: String(item.product?.id ?? ''),
        quantity: Number(item.quantity ?? 0),
        price: Number(item.price ?? 0),
      })),
    })

    // GA4: purchase. ``transaction_id`` is the dedup key for GA4's
    // own server-side dedup; using the order ID here means a Stripe
    // webhook re-poll re-rendering the success page won't double-
    // count even if our local ``purchaseEventFired`` guard somehow
    // misses (e.g. a hard reload).
    ga4.trackPurchase({
      transaction_id: transactionId,
      currency,
      value,
      shipping: Number(shippingPrice.value ?? 0),
      coupon: order.value?.appliedCouponCodes?.length
        ? order.value.appliedCouponCodes.join(',')
        : undefined,
      items: orderItems.value.map(item => ({
        item_id: String(item.product?.id ?? ''),
        quantity: Number(item.quantity ?? 0),
        price: Number(item.price ?? 0),
      })),
    })
    // Google Ads: the purchase conversion, with the real order value and
    // the order id as transaction_id (Google dedups on it across legs).
    // new_customer is the API's Order.isFirstOrder — computed, as Google
    // asks, not hardcoded.
    googleAds.trackPurchase({
      currency,
      value,
      transactionId,
      newCustomer: order.value.isFirstOrder,
    })
    purchaseEventFired.value = true
  }
  catch (pixelErr) {
    log.warn(
      'success:pixelPurchase',
      String((pixelErr as Error)?.message ?? pixelErr),
    )
  }
}

watch(
  () => [orderNumber.value, isPaid.value],
  () => {
    if (import.meta.server) return
    tryFirePurchaseEvent()
  },
)

onMounted(() => {
  tryFirePurchaseEvent()
})

// Poll order status when coming from a payment provider.
// Viva Wallet webhooks can be delayed, so poll more aggressively.
onMounted(async () => {
  // Clear client-side cart state on arrival at the success page.
  // For Viva Wallet the checkout page is unloaded before onPaymentSuccess fires
  // (window.location.href redirect), so the Pinia cart store still holds stale
  // data. Calling cleanCartState() here ensures the cart badge resets regardless
  // of the payment method used. It also clears the server-side cart session,
  // and for Viva this is the only place that happens: order creation does not
  // clear it, and the checkout page left for Viva's before it could.
  //
  // Guard it to run at most ONCE per order: ``fromCheckout`` is derived
  // from URL query params that persist in history/bookmarks, so without
  // this a shopper who completes this order, builds a NEW cart, then
  // reopens the success URL would have that unrelated cart's session
  // wiped. Keyed on the order UUID and persisted in localStorage so the
  // one-shot holds across tabs/reloads.
  if (fromCheckout.value) {
    const cleanedKey = `checkout_cleaned_${orderUUID}`
    if (!localStorage.getItem(cleanedKey)) {
      localStorage.setItem(cleanedKey, '1')
      cleanCartState().catch(err => log.error({ action: 'success:cleanCartState', error: err }))
    }
  }

  if (!fromCheckout.value || !order.value) return

  if (order.value.isPaid || placedOffline.value) {
    // Paid already, or a COD order that will stay unpaid until the
    // courier remits — either way there is no session to poll.
    sessionVerified.value = true
    return
  }

  verifyingSession.value = true
  // Viva webhooks can be slow; Stripe is typically fast
  const maxAttempts = fromViva.value ? 15 : 5
  const interval = 2000

  for (let i = 0; i < maxAttempts; i++) {
    if (!isActive.value) break
    pollAttempt.value = i + 1
    await new Promise(resolve => setTimeout(resolve, interval))
    if (!isActive.value) break
    // Polled with `$api`, not `refresh()`: a failed refetch resets
    // `useApi`'s data to its empty default, which blanked the whole
    // confirmation. A missed poll keeps the last answer on screen and
    // the next one tries again.
    try {
      order.value = await $api(`/api/orders/uuid/${orderUUID}`, {
        method: 'GET',
        query: { languageCode: locale.value },
      })
    }
    catch (err) {
      log.warn({ action: 'checkout:pollOrder', error: err })
      continue
    }

    const status = order.value?.paymentStatus?.toLowerCase() || ''
    if (
      order.value?.isPaid
      || ['completed', 'failed', 'canceled', 'refunded'].includes(status)
    ) {
      break
    }
  }
  sessionVerified.value = true
  verifyingSession.value = false
})

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
        ? t('payment.on_delivery.description', { amount: n(paidAmount.value, 'currency') })
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
      description: collected ? t('steps.pay_there', { amount: n(paidAmount.value, 'currency') }) : '',
    },
  ]
})

const timeline = computed(() => steps.value.map(step => ({
  value: step.value,
  title: t(`steps.${step.value}`),
  description: step.description,
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

async function openInvoice() {
  if (!order.value?.id) return
  const outcome = await openOrderInvoice(order.value.id, orderUUID)
  if (outcome === 'missing') {
    toast.add({ title: t('invoice.error_title'), description: t('invoice.error_missing'), color: 'error' })
  }
  else if (outcome === 'failed') {
    toast.add({ title: t('invoice.error_title'), description: t('invoice.error_description'), color: 'error' })
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
              class="mb-4 font-display text-lg font-bold text-highlighted"
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
                </template>
              </template>
            </UTimeline>
          </section>

          <section aria-labelledby="success-summary">
            <h2
              id="success-summary"
              class="mb-4 font-display text-lg font-bold text-highlighted"
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
                  densities="x1"
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
                  {{ n(paidAmount, 'currency') }}
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
  lead: "Παραγγελία {number} · στείλαμε την απόδειξη στο {email}."
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
    invoice: Τιμολόγιο (PDF)
  invoice:
    error_title: Το τιμολόγιο δεν άνοιξε
    error_missing: Το τιμολόγιο δεν είναι ακόμη έτοιμο. Δοκίμασε ξανά σε λίγο.
    error_description: Κάτι πήγε στραβά. Δοκίμασε ξανά.
  guides:
    title: Μέχρι να φτάσει
    lead: Άρθρα από το blog μας.
en:
  title: Your order is in
  heading: Thank you, {name}. Your order is in.
  heading_anonymous: Thank you. Your order is in.
  lead: "Order {number} · we emailed the receipt to {email}."
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
    invoice: Invoice (PDF)
  invoice:
    error_title: The invoice did not open
    error_missing: The invoice is not ready yet. Try again shortly.
    error_description: Something went wrong. Try again.
  guides:
    title: While you wait
    lead: Reads from our blog.
</i18n>
