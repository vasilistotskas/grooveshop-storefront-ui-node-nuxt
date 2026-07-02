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

  const { reserveStock, releaseReservations, createPaymentIntentFromCart } = useCheckout()

  // State management
  const currentStep = ref(0)
  const checkoutMode = ref<'embedded' | 'hosted'>('hosted')
  const useHostedCheckout = computed(() => checkoutMode.value === 'hosted')
  const createdOrder = ref<OrderDetail | null>(null)
  const isSubmitting = ref(false)
  const reservationIds = ref<number[]>([])
  const retryCount = ref(0)
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

    log.info('checkout', 'handleOrderError response', { status: response?.status })

    const errorData = response._data || response.data
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
        log.warn('checkout', 'save address failed', { error })
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
      // Keep isSubmitting true during retry window to block double-submit
      isSubmitting.value = true
      retryTimeoutId.value = setTimeout(() => {
        retryTimeoutId.value = null
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
      if (!paymentIntentId.value) {
        const orderValues = buildOrderValues()
        if (!orderValues) return

        const paymentIntent = await createPaymentIntentFromCart(
          {
            payWayId: orderValues.payWayId,
            shippingKind: orderValues.shippingKind as CartCreatePaymentIntentRequestShippingKindEnum,
            shippingProviderCode: orderValues.shippingProviderCode || undefined,
            countryId: orderValues.countryId || undefined,
            regionId: orderValues.regionId || undefined,
          },
          idempotencyKey.value,
        )
        paymentIntentId.value = paymentIntent.paymentIntentId
      }

      // Create order with payment_intent_id
      const submitValues = {
        ...buildOrderValues(),
        paymentIntentId: paymentIntentId.value,
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
            await $fetch('/api/cart/clear', { method: 'POST' })
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
    // Cancel any pending retry before checking isSubmitting
    if (retryTimeoutId.value) {
      clearTimeout(retryTimeoutId.value)
      retryTimeoutId.value = null
    }

    if (isSubmitting.value) return

    isSubmitting.value = true

    log.info('checkout', 'submit:started', {
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
          log.warn('checkout', 'shipping refetch failed, using cached value', { err }),
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
      await $fetch('/api/cart/clear', { method: 'POST' })
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

  const backToForm = () => {
    createdOrder.value = null
    selectedPayWay.value = null
    // Payment is now step 2 in the 3-step flow (0: info, 1: shipping, 2: payment)
    currentStep.value = 2
  }

  const onLoyaltyRedeemed = (discount: { amount: number, currency: string, points: number }) => {
    loyaltyDiscount.value = discount
  }

  const onLoyaltyCleared = () => {
    loyaltyDiscount.value = null
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
          const currency = cart.value?.currency ?? 'EUR'
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
   * * GA4 begin_checkout (browser-only, no dedup)
   */
  const fireInitiateCheckout = () => {
    if (metaEventIds.initiateCheckout) return
    try {
      const value = Number(cart.value?.totalPrice ?? 0)
      const currency = cart.value?.currency ?? 'EUR'
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

      ga4.trackBeginCheckout({
        currency,
        value,
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
    fireInitiateCheckout,
  }
}
