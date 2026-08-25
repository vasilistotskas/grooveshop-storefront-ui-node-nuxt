export function useCheckoutSubmit({ formState, selectedPayWay, payWays, refetchShippingSettings }: {
  // The reactive form-state object from ``useCheckoutForm`` —
  // its inferred shape isn't exported, so we accept a permissive
  // record here. Field-level reads in ``buildOrderValues`` are
  // type-narrowed to the auto-generated ``OrderCreateFromCart
  // RequestWritable`` shape via the carrier registry.
  formState: Record<string, any>
  selectedPayWay: Ref<PayWay | null>
  payWays: Ref<Pagination<PayWay> | null | undefined>
  refetchShippingSettings?: () => Promise<void>
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
  const retryTimeoutId = ref<ReturnType<typeof setTimeout> | null>(null)
  // Idempotency key: generated once per checkout attempt, preserved
  // across retries so duplicate network submissions never double-charge.
  // Cleared on success or on non-retryable errors so a fresh attempt
  // (e.g. user corrects a validation error) gets a new key.
  const idempotencyKey = ref<string | null>(null)

  // Meta Pixel event_ids for browser↔server deduplication. Minted at
  // the moment the customer enters checkout (InitiateCheckout) and
  // persists across step navigation; submitted to Django in the
  // order body so the server-leg uses the same id and Meta dedups.
  // GA4 mirrors the same lifecycle but doesn't dedup against a
  // server leg — separate analytics ecosystem.
  const metaPixel = useMetaPixel()
  const tiktokPixel = useTikTokPixel()
  const ga4 = useGA4()
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
  const giftCards = ref<{ code: string, balance: number }[]>([])
  const giftCardBalanceTotal = computed(() =>
    giftCards.value.reduce((sum, card) => sum + card.balance, 0))

  // Any deduction change (loyalty points, gift cards, coupon) reprices
  // the charge — a PaymentIntent created before it is stale and would
  // hard-fail the order-create amount verification. Drop it and the
  // idempotency key that maps to it so the next submit prices fresh.
  watch(
    [
      loyaltyDiscount,
      giftCards,
      () => cart.value?.appliedCouponCodes,
      () => cart.value?.promotionDiscount,
    ],
    () => {
      paymentIntentId.value = null
      idempotencyKey.value = null
    },
    { deep: true },
  )

  // Stock error state
  const stockError = ref<{
    show: boolean
    failedItems: FailedStockItem[]
  } | null>(null)

  // Computed
  const isStripePayment = computed(() => {
    return selectedPayWay.value?.providerCode === 'stripe'
  })

  const isVivaWalletPayment = computed(() => {
    return selectedPayWay.value?.providerCode === 'viva_wallet'
  })

  const isOnlinePayment = computed(() => {
    return isStripePayment.value || isVivaWalletPayment.value
  })

  // Functions
  const handleOrderError = (response: any) => {
    let errorTitle = t('form.submit.error.general')
    let errorDescription: string | undefined

    const errorData = response._data || response.data

    log.info({
      tag: 'checkout',
      message: 'handleOrderError response',
      status: response?.status,
      errors: errorData,
    })
    // When the upstream returns a non-JSON 5xx (gateway crash, Cloudflare
    // error page, etc.) ``errorData`` is undefined and the structured
    // branches below all miss — the user sees the generic toast and
    // ops has no signal in the logs. Capture the raw response shape so
    // a real outage is grep-able.
    if (!errorData && response?.status && response.status >= 500) {
      log.error({
        action: 'checkout:orderError:nonJson5xx',
        status: response.status,
        statusText: response?.statusText,
        contentType: response?.headers?.get?.('content-type'),
      })
    }
    const errorType = errorData?.error?.type

    // Handle structured error types
    if (errorType === 'invalid_order_data') {
      const detail = errorData?.detail || ''

      // Check if it's an expired reservation error
      if (detail.includes('expired') || detail.includes('Reservation')) {
        errorTitle = t('form.submit.error.reservation_expired')
        errorDescription = t('form.submit.error.reservation_expired_description')

        // Clear expired reservations
        reservationIds.value = []
        return { title: errorTitle, description: errorDescription, shouldRetry: true }
      }

      errorTitle = t('form.submit.error.invalid_order_data')
      errorDescription = detail || t('form.submit.error.invalid_order_data_description')
    }
    else if (errorType === 'insufficient_stock') {
      errorTitle = t('form.submit.error.insufficient_stock')
      errorDescription = errorData?.detail || t('form.submit.error.insufficient_stock_description')
    }
    else if (errorType === 'payment_not_found' || errorType === 'payment_verification') {
      errorTitle = t('form.submit.error.payment_verification')
      errorDescription = errorData?.detail || t('form.submit.error.payment_verification_description')
    }
    else if (errorType === 'invalid_coupon') {
      errorTitle = t('form.submit.error.invalid_coupon')
      errorDescription = errorData?.detail || t('form.submit.error.invalid_coupon_description')
    }
    else if (errorType === 'invalid_gift_card') {
      errorTitle = t('form.submit.error.invalid_gift_card')
      errorDescription = errorData?.detail || t('form.submit.error.invalid_gift_card_description')
    }
    // Handle ValidationError with cart field
    else if (errorData?.cart && Array.isArray(errorData.cart)) {
      const cartErrors = errorData.cart
      if (cartErrors.length > 0) {
        const errorMsg = cartErrors[0]
        if (errorMsg.includes('insufficient stock') || errorMsg.includes('Insufficient stock')) {
          errorTitle = t('form.submit.error.insufficient_stock')
          errorDescription = errorMsg
        }
        else {
          errorTitle = t('form.submit.error.inventory')
          errorDescription = cartErrors.join('. ')
        }
      }
    }
    // DRF serializer field errors: { field: ["msg", ...] } — e.g.
    // {"phone": ["Enter a valid phone number."]}. Surface every message
    // under its translated form label so the customer sees exactly what
    // to fix instead of the generic failure toast. Field-level Zod
    // validation should catch these first — this is the safety net for
    // rules only Django knows about.
    else if (isDrfFieldErrorMap(errorData)) {
      errorTitle = t('form.submit.error.invalid_order_data')
      errorDescription = formatDrfFieldErrors(errorData, t)
    }
    // Fallback to detail
    else if (errorData?.detail) {
      errorTitle = t('form.submit.error.general')
      errorDescription = errorData.detail
    }

    return { title: errorTitle, description: errorDescription, shouldRetry: false }
  }

  const buildOrderValues = () => {
    if (!formState.payWayId) {
      toast.add({ title: t('form.submit.error.general'), color: 'error' })
      return
    }

    // Map the local UI radio selection to the registry-driven
    // (provider_code, kind) pair the API expects. Home delivery
    // sends only ``shipping_kind`` and lets Django's dynamic
    // auto-router pick the active home-delivery provider. The
    // carrier owns its own payload shape via ``buildOrderPayload``
    // — adding ELTA / Speedex requires no edits here.
    const carrier = carrierForMethod(formState.shippingMethod)
    const shippingKind = formState.shippingMethod === 'home_delivery'
      ? 'home_delivery'
      : 'pickup_point'
    const carrierPayload = carrier?.buildOrderPayload?.(formState) ?? {}

    const metaPayload = buildMetaPayload()

    return {
      payWayId: formState.payWayId,
      countryId: formState.countryId!,
      regionId: formState.regionId,
      firstName: formState.firstName,
      lastName: formState.lastName,
      email: formState.email,
      street: formState.street,
      streetNumber: formState.streetNumber,
      city: formState.city,
      zipcode: formState.zipcode,
      // The phone UInput displays a sticky "+30" leading badge and users
      // type their Greek local number (e.g. 6912345678). Django's
      // phonenumber_field expects E.164, so normalize to "+30<local>"
      // unless the user already typed an international prefix.
      phone: normalizeGreekPhone(formState.phone),
      customerNotes: formState.customerNotes,
      // B2B billing — only meaningful when documentType=INVOICE. The
      // server strips EL/GR prefix and uppercases country, but we
      // send whatever the user entered; empty strings are tolerated.
      documentType: formState.documentType,
      billingVatId: formState.billingVatId || undefined,
      billingCountry: formState.billingCountry || undefined,
      loyaltyPointsToRedeem: loyaltyDiscount.value?.points ?? undefined,
      giftCardCodes: giftCards.value.length
        ? giftCards.value.map(card => card.code)
        : undefined,
      shippingProviderCode: carrier?.code,
      shippingKind,
      ...carrierPayload,
      ...(metaPayload ? { meta: metaPayload } : {}),
    } as OrderCreateFromCartRequest
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
      phone: normalizeGreekPhone(formState.phone),
      street: formState.street,
      streetNumber: formState.streetNumber,
      city: formState.city,
      zipcode: formState.zipcode,
      country: formState.country,
      region: formState.region,
    }

    $fetch('/api/user/addresses', {
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

  const handleRetryableError = (errorInfo: { title: string, description?: string, shouldRetry: boolean }) => {
    if (errorInfo.shouldRetry) {
      if (retryCount.value >= MAX_RETRIES) {
        toast.add({
          title: t('form.submit.error.general'),
          description: t('form.submit.error.max_retries'),
          color: 'error',
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
      toast.add({
        title: errorInfo.title,
        description: errorInfo.description,
        color: 'error',
      })
    }
  }

  const handleOnlinePaymentFlow = async () => {
    if (!formState.payWayId) {
      toast.add({ title: t('form.submit.error.general'), color: 'error' })
      return
    }
    let handledByResponseError = false
    // Generate an idempotency key on first attempt; reuse on retries
    if (!idempotencyKey.value) {
      idempotencyKey.value = crypto.randomUUID()
    }
    try {
      // Create payment intent from cart if not already created.
      // The PI amount MUST be computed against the per-carrier
      // free-shipping threshold the order-create step will verify
      // against, so forward the carrier + kind + address codes the
      // shopper has already picked. ``buildOrderValues`` is the
      // single source of truth for how those are derived from the
      // form state — reuse it so any future field rename flows here
      // automatically.
      //
      // ``shippingProviderCode`` is optional on the PI request:
      // ``home_delivery`` is provider-agnostic in checkout (the
      // backend resolves the active home-delivery provider at order
      // creation), so for that path we send no code and the
      // backend's generic-fallback shipping calc agrees with what
      // the order-create verification will compute.
      let giftCardsCoverTotal = false
      if (!paymentIntentId.value) {
        const orderValues = buildOrderValues()
        if (!orderValues) return

        try {
          const paymentIntent = await createPaymentIntentFromCart(
            {
              payWayId: orderValues.payWayId,
              shippingKind: orderValues.shippingKind as CartCreatePaymentIntentRequestShippingKindEnum,
              shippingProviderCode: orderValues.shippingProviderCode || undefined,
              countryId: orderValues.countryId || undefined,
              regionId: orderValues.regionId || undefined,
              // Identity + gift cards keep the intent amount in
              // lockstep with the order-create verification: promotion
              // eligibility can depend on the email, and gift cards
              // settle part of the total before the provider charge.
              email: orderValues.email || undefined,
              giftCardCodes: orderValues.giftCardCodes,
              loyaltyPointsToRedeem: orderValues.loyaltyPointsToRedeem,
            },
            idempotencyKey.value,
          )
          paymentIntentId.value = paymentIntent.paymentIntentId
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
            toast.add({
              title: t('form.submit.error.loyalty_requires_authentication'),
              color: 'error',
            })
            return
          }
          else if (piReason === 'loyalty_redemption_invalid') {
            // Stale widget state (points spent in another tab, tier
            // changed…) — drop the local redemption so the next
            // attempt prices without it.
            loyaltyDiscount.value = null
            toast.add({
              title: t('form.submit.error.loyalty_redemption_invalid'),
              description: piError?.data?.detail,
              color: 'error',
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
        ...buildOrderValues(),
        ...(paymentIntentId.value
          ? { paymentIntentId: paymentIntentId.value }
          : {}),
      } as OrderCreateFromCartRequest

      await $fetch('/api/orders', {
        method: 'POST',
        headers: {
          ...useRequestHeaders(),
          'Idempotency-Key': idempotencyKey.value,
        },
        body: submitValues,
        async onResponse({ response }) {
          if (!response.ok) return

          createdOrder.value = response._data
          maybeSaveDeliveryAddress()
          // Clear idempotency key on success so a future checkout starts fresh
          idempotencyKey.value = null

          if (giftCardsCoverTotal) {
            // The order is already settled from the gift-card balance —
            // no Stripe confirmation step follows, so finish like the
            // offline flow: clear the cart and land on success.
            retryCount.value = 0
            toast.add({
              title: t('form.submit.success'),
              color: 'success',
            })
            try {
              await $fetch('/api/cart/clear-session', { method: 'POST' })
            }
            catch (err) {
              log.error({ action: 'checkout:clearCart', error: err })
            }
            await cleanCartState()
            await fetch()
            if (response._data?.uuid) {
              await navigateTo(localePath({
                name: 'checkout-success-uuid',
                params: { uuid: response._data.uuid },
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
        },
        onResponseError({ response }) {
          // Clear stale payment intent so the next retry creates a fresh one
          paymentIntentId.value = null
          handledByResponseError = true
          const errorInfo = handleOrderError(response)
          // Clear idempotency key on non-retryable errors so the next
          // fresh attempt doesn't reuse a key that maps to a failed intent
          if (!errorInfo.shouldRetry) {
            idempotencyKey.value = null
          }
          handleRetryableError(errorInfo)
        },
      })
    }
    catch (error: unknown) {
      log.error({ action: 'checkout:orderCreation', error })
      if (!handledByResponseError) {
        idempotencyKey.value = null
        toast.add({
          title: t('payment_intent_error'),
          description: getErrorDetail(error) || t('payment_intent_error_description'),
          color: 'error',
        })
      }
    }
  }

  const handleVivaWalletPaymentFlow = async () => {
    const orderBody = buildOrderValues()
    if (!orderBody) return

    let handledByResponseError = false
    try {
      await $fetch('/api/orders', {
        method: 'POST',
        headers: useRequestHeaders(),
        body: orderBody,
        async onResponse({ response }) {
          if (!response.ok) return

          createdOrder.value = response._data
          maybeSaveDeliveryAddress()

          toast.add({
            title: t('order_created_payment_required'),
            description: t('complete_payment_to_finish'),
            color: 'info',
          })
        },
        onResponseError({ response }) {
          handledByResponseError = true
          handleRetryableError(handleOrderError(response))
        },
      })
    }
    catch (error: unknown) {
      log.error({ action: 'checkout:vivaWalletOrderCreation', error })
      if (!handledByResponseError) {
        toast.add({
          title: t('payment_intent_error'),
          description: getErrorDetail(error) || t('payment_intent_error_description'),
          color: 'error',
        })
        // Release any stock reservations held for this checkout attempt
        if (reservationIds.value.length > 0) {
          releaseReservations(reservationIds.value)
            .catch(err => log.error({ action: 'checkout:releaseReservations', error: err }))
          reservationIds.value = []
        }
      }
    }
  }

  const handleOfflinePaymentFlow = async () => {
    const orderBody = buildOrderValues()
    if (!orderBody) return

    try {
      await $fetch('/api/orders', {
        method: 'POST',
        headers: useRequestHeaders(),
        body: orderBody,
        async onResponse({ response }) {
          if (!response.ok) return

          createdOrder.value = response._data
          maybeSaveDeliveryAddress()

          // Reset retry counter on success
          retryCount.value = 0

          toast.add({
            title: t('form.submit.success'),
            color: 'success',
          })
          // Clear cart server-side after order is confirmed
          try {
            await $fetch('/api/cart/clear-session', { method: 'POST' })
          }
          catch (err) {
            log.error({ action: 'checkout:clearCart', error: err })
          }
          await cleanCartState()
          await fetch()
          if (!response._data?.uuid) {
            log.error({ action: 'checkout:offlinePayment', error: 'No order UUID' })
            return
          }
          // ``placed=1`` marks a real checkout arrival for the success
          // page (purchase pixels + cart cleanup) — offline pay-ways
          // have no provider redirect param (session_id / s) to key on.
          await navigateTo(localePath({
            name: 'checkout-success-uuid',
            params: { uuid: response._data.uuid },
            query: { placed: '1' },
          }))
        },
        onResponseError({ response }) {
          handleRetryableError(handleOrderError(response))
        },
      })
    }
    catch (error: unknown) {
      log.error({ action: 'checkout:orderCreation', error })
    }
  }

  const onSubmit = async () => {
    // Capture and clear the re-entry flag first: a fresh (user-initiated)
    // submit resets the retry counter, an automatic retry preserves it.
    const wasRetry = isRetryReentry.value
    isRetryReentry.value = false

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
          toast.add({
            title: t('form.submit.error.stock_reservation'),
            description: getErrorDetail(error) || t('form.submit.error.stock_reservation_description'),
            color: 'error',
          })
          return
        }
      }

      // Step 2a: Refetch shipping price to ensure the sidebar total
      // reflects the latest server-side cost before order creation.
      if (refetchShippingSettings) {
        await refetchShippingSettings().catch(err =>
          log.warn({ tag: 'checkout', message: 'shipping refetch failed, using cached value', err }),
        )
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
        toast.add({
          title: t('form.submit.error.general'),
          description: getErrorDetail(error) || t('error_occurred'),
          color: 'error',
        })
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
    // Clear cart server-side only after payment is confirmed so a failed
    // Stripe confirmation doesn't wipe the cart before we know it succeeded.
    try {
      await $fetch('/api/cart/clear-session', { method: 'POST' })
    }
    catch (err) {
      log.error({ action: 'checkout:clearCart', error: err })
    }
    await cleanCartState()
    await fetch()
    await navigateTo(localePath({
      name: 'checkout-success-uuid',
      params: { uuid: createdOrder.value?.uuid },
    }))
  }

  const onPaymentError = async (error: string) => {
    toast.add({
      title: t('payment_failed'),
      description: error,
      color: 'error',
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
    idempotencyKey.value = null
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

  const onGiftCardApplied = (card: { code: string, balance: number }) => {
    if (giftCards.value.some(existing => existing.code === card.code)) return
    giftCards.value = [...giftCards.value, card]
  }

  const onGiftCardRemoved = (code: string) => {
    giftCards.value = giftCards.value.filter(card => card.code !== code)
  }

  const nextStep = async () => {
    if (currentStep.value < 2) {
      currentStep.value++
      // Meta Pixel: AddPaymentInfo + GA4: add_payment_info both fire
      // once when the customer enters the payment step. Browser-only
      // events (no server-side dedup); the Meta composable mints its
      // own eventID.
      if (currentStep.value === 2 && !metaEventIds.addPaymentInfo) {
        try {
          const value = Number(cart.value?.totalPrice ?? 0)
          const currency = cart.value?.currency ?? tenantStore.defaultCurrency
          const productIds
            = cart.value?.items
              ?.map(item => String(item.product?.id ?? ''))
              .filter(id => !!id) ?? []
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
            contents:
              cart.value?.items?.map(item => ({
                contentId: String(item.product?.id ?? ''),
                quantity: Number(item.quantity ?? 0),
                price: Number(
                  item.product?.finalPrice ?? item.product?.price ?? 0,
                ),
              })) ?? [],
          })

          ga4.trackAddPaymentInfo({
            currency,
            value,
            payment_type: selectedPayWay.value?.providerCode || undefined,
            items:
              cart.value?.items?.map(item => ({
                item_id: String(item.product?.id ?? ''),
                quantity: Number(item.quantity ?? 0),
                price: Number(
                  item.product?.finalPrice ?? item.product?.price ?? 0,
                ),
              })) ?? [],
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
      const productIds
        = cart.value?.items
          ?.map(item => String(item.product?.id ?? ''))
          .filter(id => !!id) ?? []
      const eventId = metaPixel.trackInitiateCheckout({
        currency,
        value,
        contentType: 'product',
        contentIds: productIds,
        numItems: cart.value?.totalItems ?? 0,
      })
      if (eventId) metaEventIds.initiateCheckout = eventId

      tiktokPixel.trackInitiateCheckout({
        currency,
        value,
        contentType: 'product',
        contents:
          cart.value?.items?.map(item => ({
            contentId: String(item.product?.id ?? ''),
            quantity: Number(item.quantity ?? 0),
            price: Number(
              item.product?.finalPrice ?? item.product?.price ?? 0,
            ),
          })) ?? [],
      })

      ga4.trackBeginCheckout({
        currency,
        value,
        // The GA4 schema always had a coupon slot — populate it with
        // the server-attached codes so campaign reporting can segment
        // couponed checkouts.
        coupon: cart.value?.appliedCouponCodes?.length
          ? cart.value.appliedCouponCodes.join(',')
          : undefined,
        items:
          cart.value?.items?.map(item => ({
            item_id: String(item.product?.id ?? ''),
            quantity: Number(item.quantity ?? 0),
            price: Number(
              item.product?.finalPrice ?? item.product?.price ?? 0,
            ),
          })) ?? [],
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
