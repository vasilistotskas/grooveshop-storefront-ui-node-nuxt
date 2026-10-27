import type { FormError } from '@nuxt/ui'

export function useCheckoutSubmit({ formState, selectedPayWay, payWays, selectedCountry, refetchShippingOptions, shippingOverWeight }: {
  // The reactive form-state object from ``useCheckoutForm`` —
  // its inferred shape isn't exported, so we accept a permissive
  // record here. Field-level reads in ``buildOrderValues`` are
  // type-narrowed to the auto-generated ``OrderCreateFromCart
  // RequestWritable`` shape via the carrier registry.
  formState: Record<string, any>
  selectedPayWay: Ref<PayWay | null>
  payWays: Ref<Pagination<PayWay> | null | undefined>
  /** The ``Country`` row matching ``formState.country`` — drives phone normalization. */
  selectedCountry: Ref<Country | undefined>
  /** Resolves whether the selected method still has a live price. */
  refetchShippingOptions?: () => Promise<boolean>
  /** Set when the cart is over every offered method's weight cap. */
  shippingOverWeight?: Ref<ShippingOverWeight | null>
}) {
  const { fetch } = useUserSession()
  const localePath = useLocalePath()
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)
  const toast = useToast()

  const cartStore = useCartStore()
  const { cleanCartState } = cartStore
  const { cart } = storeToRefs(cartStore)
  const tenantStore = useTenantStore()

  const { reserveStock, releaseReservations, createPaymentIntentFromCart } = useCheckout()
  const orderAttribution = useOrderAttribution()

  // State management
  const currentStep = ref(0)
  const checkoutMode = ref<'embedded' | 'hosted'>('hosted')
  const useHostedCheckout = computed(() => checkoutMode.value === 'hosted')
  const createdOrder = ref<OrderDetail | null>(null)
  const isSubmitting = ref(false)
  const reservationIds = ref<number[]>([])
  const retryCount = ref(0)
  // Set when the retry timer re-enters onSubmit, so a fresh user-initiated
  // submit resets the retry counter but an automatic retry keeps it.
  const isRetryReentry = ref(false)
  const MAX_RETRIES = 3
  const paymentIntentId = ref<string | null>(null)
  // What the current intent was priced from (`intentPricing`): it is
  // reused only while that is unchanged.
  const intentPricedFrom = ref<string | null>(null)
  const retryTimeoutId = ref<ReturnType<typeof setTimeout> | null>(null)
  // The idempotency key of the current checkout attempt, with the
  // fingerprint of the inputs it was minted for (`orderFingerprint`).
  // Django replays the first outcome for a repeated key, so every submit
  // of the same attempt (double click, retry after a dropped connection)
  // carries the same key and can never create a second order. It is
  // replaced when the order inputs or the cart change, and dropped once
  // the outcome is final: the order was placed, or Django rejected it
  // (it caches a 4xx under the key too, so a repeat would replay the
  // rejection).
  const orderAttempt = ref<{ key: string, fingerprint: string } | null>(null)
  // Django field errors for the address step, handed to its ``UForm``
  // (``setErrors``) when a rejected order sends the shopper back there.
  const addressStepErrors = ref<FormError[]>([])

  // Meta Pixel event_ids for browser↔server deduplication. Minted at
  // the moment the customer enters checkout (InitiateCheckout) and
  // persists across step navigation; submitted to Django in the
  // order body so the server-leg uses the same id and Meta dedups.
  // GA4 mirrors the same lifecycle but doesn't dedup against a
  // server leg — separate analytics ecosystem.
  const metaPixel = useMetaPixel()
  const tiktokPixel = useTikTokPixel()
  const openaiPixel = useOpenAIPixel()
  const ga4 = useGA4()
  const googleAds = useGoogleAds()
  const cookieControl = useCookieControl()
  const metaEventIds = reactive<{
    initiateCheckout?: string
    addPaymentInfo?: string
    purchase?: string
  }>({})

  /**
   * Build the ``meta`` payload forwarded to Django at order creation.
   * Returns ``null`` when consent isn't granted so we don't leak
   * dedup ids server-side for customers who refused marketing
   * cookies. The Nuxt server proxy (``server/api/orders/index.post.ts``)
   * enriches this with fbp/fbc + UA + IP before forwarding.
   */
  const buildMetaPayload = () => {
    const adsConsent = (cookieControl.cookiesEnabledIds.value ?? []).includes(
      'ad_storage',
    )
    if (!adsConsent) return null
    // Fresh Purchase id every submit so retries don't dedup against
    // a previous (failed) attempt. The InitiateCheckout id is
    // sticky for the lifetime of the checkout page.
    const purchaseId = metaPixel.newEventId()
    metaEventIds.purchase = purchaseId
    return {
      consent: { ads: true },
      event_ids: {
        ...(metaEventIds.initiateCheckout
          ? { initiate_checkout: metaEventIds.initiateCheckout }
          : {}),
        ...(metaEventIds.addPaymentInfo
          ? { add_payment_info: metaEventIds.addPaymentInfo }
          : {}),
        purchase: purchaseId,
      },
    }
  }

  // Loyalty discount state
  const loyaltyDiscount = ref<{ amount: number, currency: string, points: number } | null>(null)

  // Gift cards the shopper wants to redeem. The widget validates each
  // code via /api/giftcard/check for display; Django re-validates the
  // codes under row locks at order creation — that pass is the
  // authoritative one, these balances only drive the sidebar preview.
  const giftCards = ref<AppliedGiftCard[]>([])
  const giftCardBalanceTotal = computed(() =>
    giftCards.value.reduce((sum, card) => sum + card.balance, 0))

  // A failure that stops the checkout stays on the page until the shopper
  // acts again: a toast times out, and a shopper who looked away would not
  // know why «Pay» did nothing (`<ApiErrorAlert>` on the checkout page).
  const submitError = ref<DescribedApiError | null>(null)
  const failCheckout = (failure: { title: string, description?: string, code?: string, requestId?: string }) => {
    submitError.value = {
      title: failure.title,
      description: failure.description ?? '',
      code: failure.code,
      requestId: failure.requestId,
      fieldErrors: [],
      serverFault: false,
    }
  }
  const failCheckoutWith = (error: unknown, options: DescribeApiErrorOptions) => {
    submitError.value = describeApiError(error, options)
  }

  // Stock error state
  const stockError = ref<{
    show: boolean
    failedItems: FailedStockItem[]
  } | null>(null)

  // Computed
  const isStripePayment = computed(() => {
    return selectedPayWay.value?.providerCode === zPaymentProviderEnum.enum.stripe
  })

  const isVivaWalletPayment = computed(() => {
    return selectedPayWay.value?.providerCode === zPaymentProviderEnum.enum.viva_wallet
  })

  const isOnlinePayment = computed(() => {
    return isStripePayment.value || isVivaWalletPayment.value
  })

  // Functions
  const handleOrderError = (response: RefusedResponse) => {
    const errorData = response._data

    log.info({
      tag: 'checkout',
      message: 'handleOrderError response',
      status: response.status,
      errors: errorData,
    })
    // When the upstream returns a non-JSON 5xx (gateway crash, Cloudflare
    // error page, etc.) ``errorData`` is undefined and the structured
    // branches below all miss — the user sees the generic toast and
    // ops has no signal in the logs. Capture the raw response shape so
    // a real outage is grep-able.
    if (!errorData && response.status && response.status >= 500) {
      log.error({
        action: 'checkout:orderError:nonJson5xx',
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers?.get('content-type'),
      })
    }
    const errorInfo = classifyOrderError(errorData, t)
    // The only retryable error is an expired hold: drop the dead
    // reservation ids so the retry re-reserves stock.
    if (errorInfo.shouldRetry) reservationIds.value = []
    // A field the address step owns: go back there and show each
    // message under its own input, not only in the toast.
    if (errorInfo.addressStepErrors.length) {
      addressStepErrors.value = errorInfo.addressStepErrors
      currentStep.value = 0
    }
    // What the shopper quotes to support: the refusal's stable code and
    // the request's id (`describeApiError` reads both).
    const { code, requestId } = describeApiError({ status: response.status, data: errorData, response }, {})
    return { ...errorInfo, code, requestId }
  }

  const buildOrderValues = () => {
    if (!formState.payWayId) {
      failCheckout({ title: t('form.submit.error.general') })
      return
    }

    const metaPayload = buildMetaPayload()
    // Where this tab's visit came from, captured on landing by
    // ``plugins/attribution.client.ts``; Django classifies the source.
    const attribution = orderAttribution.read()

    return buildOrderCreateBody(formState, {
      selectedCountry: selectedCountry.value,
      loyaltyDiscount: loyaltyDiscount.value,
      giftCards: giftCards.value,
      meta: metaPayload,
      attribution,
    })
  }

  /**
   * Fire-and-forget persistence of the checkout address to the signed-in
   * user's address book when they opted in via the "Save this address"
   * checkbox. Errors are swallowed intentionally: a failed save must
   * never block a successful purchase. The surfaced toast is friendly
   * rather than alarming so the user knows the order went through even
   * if the bonus bookkeeping didn't.
   */
  const maybeSaveDeliveryAddress = () => {
    if (!formState.saveAddress) return
    const title = (formState.addressTitle ?? '').trim()
    if (!title) return

    const body = {
      title,
      firstName: formState.firstName,
      lastName: formState.lastName,
      phone: normalizePhone(formState.phone, selectedCountry.value),
      street: formState.street,
      streetNumber: formState.streetNumber,
      city: formState.city,
      zipcode: normalizePostcode(formState.zipcode),
      country: formState.country,
      region: formState.region,
    }

    $api('/api/user/addresses', {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
    })
      .then(() => {
        toast.add({
          title: t('form.submit.address_saved_title'),
          description: t('form.submit.address_saved_description'),
          color: 'success',
          icon: 'i-heroicons-bookmark',
        })
      })
      .catch((error) => {
        log.warn({ tag: 'checkout', message: 'save address failed', error })
        toast.add({
          title: t('form.submit.address_save_failed_title'),
          description: t('form.submit.address_save_failed_description'),
          color: 'warning',
          icon: 'i-heroicons-exclamation-triangle',
        })
      })
  }

  const handleRetryableError = (errorInfo: { title: string, description?: string, shouldRetry: boolean, code?: string, requestId?: string }) => {
    if (errorInfo.shouldRetry) {
      if (retryCount.value >= MAX_RETRIES) {
        failCheckout({
          title: t('form.submit.error.general'),
          description: t('form.submit.error.max_retries'),
        })
        return
      }
      retryCount.value++
      // Keep isSubmitting true during the retry window to block double-submit,
      // then release it right before re-entering onSubmit — otherwise the
      // re-entrant call hits the `if (isSubmitting.value) return` guard and the
      // checkout deadlocks with the CTA spinning forever.
      isSubmitting.value = true
      retryTimeoutId.value = setTimeout(() => {
        retryTimeoutId.value = null
        isSubmitting.value = false
        isRetryReentry.value = true
        onSubmit()
      }, 500)
    }
    else {
      failCheckout({
        title: errorInfo.title,
        description: errorInfo.description,
        code: errorInfo.code,
        requestId: errorInfo.requestId,
      })
    }
  }

  /**
   * Everything a PaymentIntent's amount is computed from: the request
   * body (pay way, shipping, destination, email, gift cards, loyalty)
   * and the cart it prices — its lines, total, coupons and promotion.
   */
  const cartPricedFrom = () => ({
    lines: cart.value?.items?.map(item => [item.product.id, item.quantity]) ?? [],
    total: cart.value?.totalPrice ?? null,
    coupons: cart.value?.appliedCouponCodes ?? [],
    promotion: cart.value?.promotionDiscount ?? null,
  })

  const intentPricing = (body: Parameters<typeof createPaymentIntentFromCart>[0]) => JSON.stringify({
    body,
    ...cartPricedFrom(),
  })

  /**
   * What an order submit is made of: the order body and the cart it is
   * priced from. The Meta ``meta`` ids are left out — a fresh Purchase
   * id is minted per submit, and a retry must still count as the same
   * attempt.
   */
  const orderFingerprint = (orderValues: OrderCreateFromCartRequestWritable) => JSON.stringify({
    order: { ...orderValues, meta: undefined },
    ...cartPricedFrom(),
  })

  /**
   * The idempotency key for this order submit: the current attempt's
   * while its inputs are unchanged, else a fresh one.
   */
  const orderIdempotencyKey = (fingerprint: string) => {
    if (orderAttempt.value?.fingerprint !== fingerprint) {
      orderAttempt.value = { key: crypto.randomUUID(), fingerprint }
    }
    return orderAttempt.value.key
  }

  /** The headers of an order request: the shopper's own and the attempt's key. */
  const orderRequestHeaders = (fingerprint: string) => ({
    ...useRequestHeaders(),
    [IDEMPOTENCY_KEY_HEADER]: orderIdempotencyKey(fingerprint),
  })

  /** Ends the attempt when ``error`` settles it (see ``rejectionSettlesAttempt``). */
  const settleAttemptOnFailure = (error: unknown) => {
    if (rejectionSettlesAttempt(failedStatusOf(error))) orderAttempt.value = null
  }

  /**
   * Posts the order and answers it, or `null` when Django refused it: the
   * refusal is then classified for the shopper (`handleOrderError`), ends
   * the attempt when it settles it, and is retried when retryable.
   * `onRefused` runs first, for what the caller's flow drops on a refusal.
   * A request that got no answer at all rejects, for the caller's catch.
   *
   * The answer is handled after the `await`, never in ofetch's hooks:
   * ofetch runs `onResponseError` and THEN rejects, so a hook needed a
   * flag to keep the catch from reporting the same failure twice.
   */
  const postOrder = async (
    body: OrderCreateFromCartRequestWritable,
    fingerprint: string,
    onRefused?: () => void,
  ): Promise<OrderDetail | null> => {
    try {
      return await $api<OrderDetail>('/api/orders', {
        method: 'POST',
        headers: orderRequestHeaders(fingerprint),
        body,
      })
    }
    catch (error: unknown) {
      const response = refusedResponseOf(error)
      if (!response) throw error
      onRefused?.()
      settleAttemptOnFailure({ response })
      handleRetryableError(handleOrderError(response))
      return null
    }
  }

  const handleOnlinePaymentFlow = async () => {
    if (!formState.payWayId) {
      failCheckout({ title: t('form.submit.error.general') })
      return
    }
    const orderValues = buildOrderValues()
    if (!orderValues) return
    // ``shippingProviderCode`` is optional on the PI request:
    // ``home_delivery`` is provider-agnostic in checkout (the backend
    // resolves the active home-delivery provider at order creation), so
    // for that path we send no code and the backend's generic-fallback
    // shipping calc agrees with what the order-create verification will
    // compute. Identity + gift cards keep the intent amount in lockstep
    // with that verification: promotion eligibility can depend on the
    // email, and gift cards settle part of the total before the charge.
    const intentBody = {
      payWayId: orderValues.payWayId,
      shippingKind: orderValues.shippingKind as CartCreatePaymentIntentRequestShippingKindEnum,
      shippingProviderCode: orderValues.shippingProviderCode || undefined,
      // Required: a ShippingRate is per-country, so the PI amount can't
      // be computed without a destination.
      countryId: orderValues.countryId,
      regionId: orderValues.regionId || undefined,
      email: orderValues.email || undefined,
      giftCardCodes: orderValues.giftCardCodes,
      loyaltyPointsToRedeem: orderValues.loyaltyPointsToRedeem,
    }
    const pricing = intentPricing(intentBody)
    // An intent is priced once. If anything it was priced from changed
    // since — a deduction, the cart, the address, the shipping or the
    // pay way — order-create would reject it on the amount, so price a
    // fresh one. Those inputs also change the attempt's fingerprint, so
    // the new intent and order go out under a fresh idempotency key. A
    // cart refresh that changes none of it keeps both, as does a plain
    // retry.
    if (paymentIntentId.value && pricing !== intentPricedFrom.value) {
      paymentIntentId.value = null
    }
    const fingerprint = orderFingerprint(orderValues)
    try {
      // Create a payment intent from the cart unless a current one exists.
      // Its amount MUST be computed against the per-carrier free-shipping
      // threshold the order-create step verifies against, so the body
      // carries the carrier + kind + address codes ``buildOrderValues``
      // derives from the form state.
      let giftCardsCoverTotal = false
      if (!paymentIntentId.value) {
        try {
          const paymentIntent = await createPaymentIntentFromCart(intentBody, orderIdempotencyKey(fingerprint))
          paymentIntentId.value = paymentIntent.paymentIntentId
          intentPricedFrom.value = pricing
        }
        catch (piError: any) {
          const piReason = piError?.data?.reason
          // Deductions (gift cards / promotions / loyalty) cover
          // everything — there is nothing left for Stripe to charge,
          // so submit the order WITHOUT an intent and let the backend
          // settle it order-first from the applied deductions.
          if (
            piReason === 'gift_card_covers_total'
            || piReason === 'nothing_to_charge'
          ) {
            giftCardsCoverTotal = true
          }
          else if (piReason === 'loyalty_requires_authentication') {
            // The shopper signs in and submits the same inputs again; a
            // key that replayed this refusal would never let them through.
            settleAttemptOnFailure(piError)
            failCheckout({
              title: t('form.submit.error.loyalty_requires_authentication'),
            })
            return
          }
          else if (piReason === 'loyalty_redemption_invalid') {
            // Stale widget state (points spent in another tab, tier
            // changed…) — drop the local redemption so the next
            // attempt prices without it.
            loyaltyDiscount.value = null
            failCheckout({
              title: t('form.submit.error.loyalty_redemption_invalid'),
              description: describeApiError(piError).description,
            })
            return
          }
          else {
            throw piError
          }
        }
      }

      // Create order with payment_intent_id (absent when gift cards
      // cover the full total — the backend routes order-first then).
      const submitValues = {
        ...orderValues,
        ...(paymentIntentId.value
          ? { paymentIntentId: paymentIntentId.value }
          : {}),
      }

      // A refused order drops its intent, so the next retry prices a
      // fresh one.
      const order = await postOrder(submitValues, fingerprint, () => {
        paymentIntentId.value = null
      })
      if (!order) return

      createdOrder.value = order
      maybeSaveDeliveryAddress()
      // The order exists: the next checkout starts a new attempt.
      orderAttempt.value = null

      if (giftCardsCoverTotal) {
        // The order is already settled from the gift-card balance — no
        // Stripe confirmation step follows, so finish like the offline
        // flow: clear the cart and land on success.
        retryCount.value = 0
        // No "order created" toast here — see the offline flow below.
        await cleanCartState()
        await fetch()
        if (order.uuid) {
          await navigateTo(localePath({
            name: 'checkout-success-uuid',
            params: { uuid: order.uuid },
            query: { placed: '1' },
          }))
        }
        return
      }

      toast.add({
        title: t('order_created_payment_required'),
        description: t('complete_payment_to_finish'),
        color: 'info',
      })
    }
    catch (error: unknown) {
      log.error({ action: 'checkout:orderCreation', error })
      // The intent request, or an order request that got no answer: a 4xx
      // on the intent is cached under the key like the order's.
      settleAttemptOnFailure(error)
      failCheckoutWith(error, { title: t('payment_intent_error'), fallback: t('payment_intent_error_description') })
    }
  }

  const handleVivaWalletPaymentFlow = async () => {
    const orderBody = buildOrderValues()
    if (!orderBody) return

    try {
      const order = await postOrder(orderBody, orderFingerprint(orderBody))
      if (!order) return

      createdOrder.value = order
      maybeSaveDeliveryAddress()
      orderAttempt.value = null

      toast.add({
        title: t('order_created_payment_required'),
        description: t('complete_payment_to_finish'),
        color: 'info',
      })
    }
    catch (error: unknown) {
      log.error({ action: 'checkout:vivaWalletOrderCreation', error })
      failCheckoutWith(error, { title: t('payment_intent_error'), fallback: t('payment_intent_error_description') })
      // Release any stock reservations held for this checkout attempt
      if (reservationIds.value.length > 0) {
        releaseReservations(reservationIds.value)
          .catch(err => log.error({ action: 'checkout:releaseReservations', error: err }))
        reservationIds.value = []
      }
    }
  }

  const handleOfflinePaymentFlow = async () => {
    const orderBody = buildOrderValues()
    if (!orderBody) return

    try {
      const order = await postOrder(orderBody, orderFingerprint(orderBody))
      if (!order) return

      createdOrder.value = order
      maybeSaveDeliveryAddress()
      orderAttempt.value = null

      // Reset retry counter on success
      retryCount.value = 0

      // Deliberately no "order created" toast. Toasts survive the
      // navigation that follows, so this one landed on the success
      // page beside the page's own confirmation AND beside the
      // backend's live notification ("Η παραγγελία #286
      // καταχωρήθηκε", `notify_order_created_live`) — three ways of
      // saying the same thing, reported from production
      // 2026-09-13. The success page is the confirmation surface;
      // the live notification is the durable record for a
      // signed-in shopper. A guest gets no live notification
      // (`order.user_id is None` skips it) but still lands on the
      // success page, which states the outcome in full.
      // Clear the cart, server-side and local, once the order is confirmed.
      await cleanCartState()
      await fetch()
      if (!order.uuid) {
        log.error({ action: 'checkout:offlinePayment', error: 'No order UUID' })
        return
      }
      // ``placed=1`` marks a real checkout arrival for the success
      // page (purchase pixels + cart cleanup) — offline pay-ways
      // have no provider redirect param (session_id / s) to key on.
      await navigateTo(localePath({
        name: 'checkout-success-uuid',
        params: { uuid: order.uuid },
        query: { placed: '1' },
      }))
    }
    catch (error: unknown) {
      log.error({ action: 'checkout:orderCreation', error })
      // An order request that got no answer: the shopper must hear that the
      // order was not placed, not see the button do nothing.
      settleAttemptOnFailure(error)
      failCheckoutWith(error, { title: t('form.submit.error.general'), fallback: t('error_occurred') })
    }
  }

  const onSubmit = async () => {
    // Capture and clear the re-entry flag first: a fresh (user-initiated)
    // submit resets the retry counter, an automatic retry preserves it.
    const wasRetry = isRetryReentry.value
    isRetryReentry.value = false
    // A new attempt starts clean: the last failure no longer applies.
    submitError.value = null

    // Cancel any pending retry before checking isSubmitting — this
    // manual submit supersedes the scheduled automatic one. The retry
    // window HOLDS the guard (isSubmitting stays true so a double-click
    // cannot race the timer), and the timer callback is the only thing
    // that releases it — so cancelling the timer without dropping the
    // guard here would strand isSubmitting=true forever: the very
    // deadlock 59355197 fixed, reintroduced through the manual-click
    // door. Caught by the retry-path spec, not by review.
    if (retryTimeoutId.value) {
      clearTimeout(retryTimeoutId.value)
      retryTimeoutId.value = null
      isSubmitting.value = false
    }

    if (isSubmitting.value) return

    isSubmitting.value = true

    if (!wasRetry) retryCount.value = 0

    log.info({
      tag: 'checkout',
      message: 'submit:started',
      payWayId: formState.payWayId,
      shippingMethod: formState.shippingMethod,
      hasReservations: reservationIds.value.length > 0,
    })

    try {
      // Step 1: Reserve stock before order creation (if not already reserved)
      if (!reservationIds.value.length) {
        try {
          const cartId = cart.value?.uuid || cart.value?.id
          if (!cartId) {
            throw new Error('Cart not found')
          }

          const response = await reserveStock(cartId)
          reservationIds.value = response

          // Clear any previous stock errors on success
          stockError.value = null
        }
        catch (error: unknown) {
          // Handle stock reservation errors with structured data
          const e = error && typeof error === 'object' ? error as Record<string, unknown> : null
          if (e?.code === 'insufficient_stock' && Array.isArray(e.failedItems)) {
            stockError.value = {
              show: true,
              failedItems: e.failedItems as FailedStockItem[],
            }

            // Scroll to top to show the error alert
            if (import.meta.client) {
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }
            return
          }

          // Handle other reservation errors
          failCheckoutWith(error, { title: t('form.submit.error.stock_reservation'), fallback: t('form.submit.error.stock_reservation_description') })
          return
        }
      }

      // Step 2a: Refetch live shipping options so the total reflects
      // the latest server-side cost before order creation. Without a
      // live price for the selected method (the fetch failed, the
      // method is no longer offered, the cart is over its cap or too
      // large for its parcels) the order would be charged a shipping
      // cost the shopper never saw, or refused, so send them back to
      // the shipping step instead.
      if (refetchShippingOptions && !(await refetchShippingOptions())) {
        log.warn({
          tag: 'checkout',
          message: 'submit:shipping-unavailable',
          shippingMethod: formState.shippingMethod,
        })
        // A cart no method can carry is the shopper's to fix (fewer
        // items), not a pricing hiccup to retry — say which it is.
        const overWeight = shippingOverWeight?.value
        failCheckout(overWeight
          ? {
              title: t('form.submit.error.shipping_over_weight'),
              description: t('shipping.method.over_weight_description', overWeight),
            }
          : {
              title: t('form.submit.error.shipping_unavailable'),
              description: t('form.submit.error.shipping_unavailable_description'),
            })
        currentStep.value = 1
        return
      }

      // Step 2b: Set selected payment way
      payWays.value?.results?.forEach((pw) => {
        if (pw.id === formState.payWay) {
          selectedPayWay.value = pw
        }
      })

      // Step 3: Branch based on payment type
      if (isStripePayment.value) {
        await handleOnlinePaymentFlow()
      }
      else if (isVivaWalletPayment.value) {
        await handleVivaWalletPaymentFlow()
      }
      else {
        await handleOfflinePaymentFlow()
      }
    }
    catch (error: unknown) {
      const e = error && typeof error === 'object' ? error as Record<string, unknown> : null
      if (e && !('response' in e) && !('data' in e)) {
        log.error({ action: 'checkout:submit', error })
        failCheckoutWith(error, { title: t('form.submit.error.general'), fallback: t('error_occurred') })
      }
    }
    finally {
      // Only reset isSubmitting if no retry is pending (retry keeps it
      // true to block double-submit). When we end up here without an
      // order created AND no retry is queued, release stock reservations
      // so a customer who bounces away after a failed checkout doesn't
      // hold inventory hostage for the full 15-minute TTL.
      if (!retryTimeoutId.value) {
        isSubmitting.value = false
        if (!createdOrder.value && reservationIds.value.length > 0) {
          releaseReservations(reservationIds.value)
            .catch(err => log.error({ action: 'checkout:releaseReservations:onSubmitFail', error: err }))
          reservationIds.value = []
        }
      }
    }
  }

  const onPaymentSuccess = async () => {
    if (!createdOrder.value?.uuid) {
      log.error({ action: 'checkout:paymentSuccess', error: 'No order UUID' })
      return
    }
    toast.add({
      title: t('payment_successful'),
      description: t('order_completed_successfully'),
      color: 'success',
    })
    // Clear the cart only after payment is confirmed so a failed Stripe
    // confirmation doesn't wipe the cart before we know it succeeded.
    await cleanCartState()
    await fetch()
    await navigateTo(localePath({
      name: 'checkout-success-uuid',
      params: { uuid: createdOrder.value?.uuid },
    }))
  }

  const onPaymentError = async (error: string) => {
    failCheckout({
      title: t('payment_failed'),
      description: error,
    })

    // Release reservations on payment failure
    if (reservationIds.value.length > 0) {
      try {
        await releaseReservations(reservationIds.value)
        reservationIds.value = []
      }
      catch (err) {
        log.error({ action: 'checkout:releaseReservations', error: err })
      }
    }
  }

  const backToForm = async () => {
    createdOrder.value = null
    selectedPayWay.value = null
    // Fully reset the payment intent + idempotency key so a resubmit
    // mints a FRESH intent rather than reusing the one bound to the
    // created order. Reusing it skipped the
    // ``if (!paymentIntentId.value)`` guard in handleOnlinePaymentFlow
    // and produced an orphaned PENDING order + unrecoverable errors.
    // Release any held reservations and resync the cart. Django clears
    // the cart on PAYMENT for online-payment orders (see
    // Order.awaits_online_payment), so in this flow the cart is still
    // alive server-side — the refresh reconciles whatever state the
    // abandoned attempt left behind. The abandoned PENDING order is
    // reaped by auto_cancel_stuck_pending_orders.
    paymentIntentId.value = null
    orderAttempt.value = null
    if (reservationIds.value.length > 0) {
      try {
        await releaseReservations(reservationIds.value)
        reservationIds.value = []
      }
      catch (err) {
        log.error({ action: 'checkout:releaseReservations', error: err })
      }
    }
    try {
      await cartStore.refreshCart()
    }
    catch (err) {
      log.error({ action: 'checkout:backToForm:refreshCart', error: err })
    }
    // Payment is now step 2 in the 3-step flow (0: info, 1: shipping, 2: payment)
    currentStep.value = 2
  }

  const onLoyaltyRedeemed = (discount: { amount: number, currency: string, points: number }) => {
    loyaltyDiscount.value = discount
  }

  const onLoyaltyCleared = () => {
    loyaltyDiscount.value = null
  }

  const onGiftCardApplied = (card: AppliedGiftCard) => {
    if (giftCards.value.some(existing => existing.code === card.code)) return
    giftCards.value = [...giftCards.value, card]
  }

  const onGiftCardRemoved = (code: string) => {
    giftCards.value = giftCards.value.filter(card => card.code !== code)
  }

  const nextStep = async () => {
    if (currentStep.value < 2) {
      // Leaving the address step means it validated: any server errors
      // it was showing are answered.
      if (currentStep.value === 0) addressStepErrors.value = []
      currentStep.value++
      // Meta Pixel: AddPaymentInfo, GA4: add_payment_info and the Google
      // Ads add-payment-info conversion all fire
      // once when the customer enters the payment step. Browser-only
      // events (no server-side dedup); the Meta composable mints its
      // own eventID.
      if (currentStep.value === 2 && !metaEventIds.addPaymentInfo) {
        try {
          const value = Number(cart.value?.totalPrice ?? 0)
          const currency = cart.value?.currency ?? tenantStore.defaultCurrency
          const productIds = cartContentIds(cart.value)
          const eventId = metaPixel.trackAddPaymentInfo({
            currency,
            value,
            contentType: 'product',
            contentIds: productIds,
            numItems: cart.value?.totalItems ?? 0,
          })
          if (eventId) metaEventIds.addPaymentInfo = eventId

          tiktokPixel.trackAddPaymentInfo({
            currency,
            value,
            contentType: 'product',
            contents: cartTikTokContents(cart.value),
          })

          googleAds.trackAddPaymentInfo({ currency, value })

          ga4.trackAddPaymentInfo({
            currency,
            value,
            payment_type: selectedPayWay.value?.providerCode || undefined,
            items: cartGa4Items(cart.value),
          })
        }
        catch (pixelErr) {
          log.warn(
            'checkout:pixelAddPaymentInfo',
            String((pixelErr as Error)?.message ?? pixelErr),
          )
        }
      }
    }
  }

  /**
   * Called once when the customer enters the checkout flow. Fires:
   * * Meta InitiateCheckout (browser leg, deduped against the Django
   *   server leg via ``metaEventIds.initiateCheckout``)
   * * TikTok InitiateCheckout (browser-only, no dedup)
   * * GA4 begin_checkout (browser-only, no dedup)
   */
  const fireInitiateCheckout = () => {
    if (metaEventIds.initiateCheckout) return
    try {
      const value = Number(cart.value?.totalPrice ?? 0)
      const currency = cart.value?.currency ?? tenantStore.defaultCurrency
      const productIds = cartContentIds(cart.value)
      const eventId = metaPixel.trackInitiateCheckout({
        currency,
        value,
        contentType: 'product',
        contentIds: productIds,
        numItems: cart.value?.totalItems ?? 0,
      })
      if (eventId) metaEventIds.initiateCheckout = eventId

      openaiPixel.trackCheckoutStarted({
        currency,
        amount: value,
        contents: cartOpenAIContents(cart.value),
      })

      tiktokPixel.trackInitiateCheckout({
        currency,
        value,
        contentType: 'product',
        contents: cartTikTokContents(cart.value),
      })

      googleAds.trackBeginCheckout({ currency, value })

      ga4.trackBeginCheckout({
        currency,
        value,
        // The GA4 schema always had a coupon slot — populate it with
        // the server-attached codes so campaign reporting can segment
        // couponed checkouts.
        coupon: cart.value?.appliedCouponCodes?.length
          ? cart.value.appliedCouponCodes.join(',')
          : undefined,
        items: cartGa4Items(cart.value),
      })
    }
    catch (pixelErr) {
      log.warn(
        'checkout:pixelInitiateCheckout',
        String((pixelErr as Error)?.message ?? pixelErr),
      )
    }
  }

  const prevStep = () => {
    if (currentStep.value > 0) {
      currentStep.value--
    }
  }

  // Release reservations if user leaves checkout without completing
  onBeforeUnmount(() => {
    if (reservationIds.value.length > 0 && !createdOrder.value) {
      releaseReservations(reservationIds.value)
        .catch(error => log.error({ action: 'checkout:releaseReservations', error }))
    }
  })

  return {
    currentStep,
    addressStepErrors,
    submitError,
    checkoutMode,
    useHostedCheckout,
    createdOrder,
    isSubmitting,
    loyaltyDiscount,
    giftCards,
    giftCardBalanceTotal,
    stockError,
    isStripePayment,
    isVivaWalletPayment,
    isOnlinePayment,
    onSubmit,
    nextStep,
    prevStep,
    backToForm,
    onPaymentSuccess,
    onPaymentError,
    onLoyaltyRedeemed,
    onLoyaltyCleared,
    onGiftCardApplied,
    onGiftCardRemoved,
    fireInitiateCheckout,
  }
}
