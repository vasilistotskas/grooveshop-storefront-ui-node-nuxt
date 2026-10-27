/**
 * Everything the order confirmation does that is not its drawing: the
 * order (by the uuid in the route; a missing one is a 404), whether the
 * shopper just came from checkout, the payment's confirmation (polled
 * while the provider's webhook is on its way), the cart cleared once per
 * order, the analytics pixels' purchase event, and a few of the store's
 * guides to read while the parcel travels.
 *
 * Shared by every drawing of the page (`Storefront/CheckoutSuccess.vue`
 * and the frozen webside copy), so a fix to what the page does lands
 * once. Call it from a body's `<script setup>`, before the first `await`.
 */
export interface CheckoutSuccessOptions {
  /** How many of the store's guides the page shows. */
  guideCount: number
}

export async function useCheckoutSuccess({ guideCount }: CheckoutSuccessOptions) {
  const { t, locale } = useI18n({ useScope: 'global' })
  // Every store and composable is read, and every hook registered, before
  // the first await: after one, the server has lost the injection context
  // Pinia needs, and a hook has no component instance to belong to.
  const blogEnabled = useStoreFeature('blog')
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
  const isActive = ref(true)

  const { cleanCartState } = useCartStore()

  const orderRequest = useApi<RetrieveOrderByUuidResponse>(
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
  const { data: order, error } = orderRequest

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

  const amountDue = computed(() => order.value?.amountDue || 0)
  const shippingPrice = computed(() => order.value?.shippingPrice || 0)

  // Only fetch + show the store's guides when the tenant has the blog
  // feature enabled — a blog-disabled store must not fire the blog API or
  // render them on its success page.
  // useLazyAsyncData still executes during SSR (`lazy` only defers on
  // client navigation), so this needs the request-bound fetch: a bare
  // $fetch loses the tenant host and 404s, silently emptying the guides.
  const requestFetch = useRequestApi()
  const { data: recommendedPosts } = useLazyAsyncData(
    `success-recommended-posts:${locale.value}`,
    () => blogEnabled.value
      ? requestFetch('/api/blog/posts', {
          query: {
            languageCode: locale.value,
            paginationType: 'pageNumber',
            pageSize: guideCount,
            ordering: '-featured,-publishedAt',
          },
        })
      : Promise.resolve(null),
    { default: () => null },
  )
  const recommendedPostsList = computed(() =>
    blogEnabled.value ? (recommendedPosts.value?.results ?? []) : [],
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
      const value = Number(amountDue.value ?? 0)
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
      await new Promise(resolve => setTimeout(resolve, interval))
      if (!isActive.value) break
      // Polled with `$api`, not `refresh()`: a failed refetch resets
      // `useApi`'s data to its empty default, which blanked the whole
      // confirmation. A missed poll keeps the last answer on screen and
      // the next one tries again.
      try {
        order.value = await $api<RetrieveOrderByUuidResponse>(`/api/orders/uuid/${orderUUID}`, {
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

  await orderRequest

  if (!order.value || error.value) {
    throw createError({
      statusCode: 404,
      message: t('error.page.not.found'),
    })
  }

  return {
    orderUUID,
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
  }
}
