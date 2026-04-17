export function useCheckoutSubmit({ formState, selectedPayWay, payWays }: {
  formState: Record<string, any>
  selectedPayWay: Ref<PayWay | null>
  payWays: Ref<Pagination<PayWay> | null | undefined>
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

  // Loyalty discount state
  const loyaltyDiscount = ref<{ amount: number, currency: string, points: number } | null>(null)

  // Stock error state
  const stockError = ref<{
    show: boolean
    failedItems: Array<{
      productId: number
      productName: string
      available: number
      requested: number
    }>
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
    else if (errorType === 'payment_not_found') {
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
      phone: formState.phone,
      customerNotes: formState.customerNotes,
      loyaltyPointsToRedeem: loyaltyDiscount.value?.points ?? undefined,
    } as OrderCreateFromCartRequest
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
    try {
      // Create payment intent from cart if not already created
      if (!paymentIntentId.value) {
        const cartId = cart.value?.uuid || cart.value?.id
        if (!cartId) {
          throw new Error('Cart not found')
        }

        const paymentIntent = await createPaymentIntentFromCart(cartId, formState.payWayId)
        paymentIntentId.value = paymentIntent.paymentIntentId
      }

      // Create order with payment_intent_id
      const submitValues = {
        ...buildOrderValues(),
        paymentIntentId: paymentIntentId.value,
      } as OrderCreateFromCartRequest

      await $fetch('/api/orders', {
        method: 'POST',
        headers: useRequestHeaders(),
        body: submitValues,
        async onResponse({ response }) {
          if (!response.ok) return

          createdOrder.value = response._data

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
          handleRetryableError(handleOrderError(response))
        },
      })
    }
    catch (error: any) {
      log.error({ action: 'checkout:orderCreation', error })
      if (!handledByResponseError) {
        toast.add({
          title: t('payment_intent_error'),
          description: error?.data?.message || error?.message || t('payment_intent_error_description'),
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
    catch (error: any) {
      log.error({ action: 'checkout:vivaWalletOrderCreation', error })
      if (!handledByResponseError) {
        toast.add({
          title: t('payment_intent_error'),
          description: error?.data?.message || error?.message || t('payment_intent_error_description'),
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

          // Reset retry counter on success
          retryCount.value = 0

          toast.add({
            title: t('form.submit.success'),
            color: 'success',
          })
          await cleanCartState()
          await fetch()
          if (!response._data?.uuid) {
            log.error({ action: 'checkout:offlinePayment', error: 'No order UUID' })
            return
          }
          await navigateTo(localePath({
            name: 'checkout-success-uuid',
            params: { uuid: response._data.uuid },
          }))
        },
        onResponseError({ response }) {
          handleRetryableError(handleOrderError(response))
        },
      })
    }
    catch (error: any) {
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
        catch (error: any) {
          // Handle stock reservation errors with structured data
          if (error.code === 'insufficient_stock' && error.failedItems) {
            stockError.value = {
              show: true,
              failedItems: error.failedItems,
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
            description: error.message || t('form.submit.error.stock_reservation_description'),
            color: 'error',
          })
          return
        }
      }

      // Step 2: Set selected payment way
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
    catch (error: any) {
      if (!error.response && !error.data) {
        log.error({ action: 'checkout:submit', error })
        toast.add({
          title: t('form.submit.error.general'),
          description: error.message || t('error_occurred'),
          color: 'error',
        })
      }
    }
    finally {
      // Only reset isSubmitting if no retry is pending (retry keeps it true to block double-submit)
      if (!retryTimeoutId.value) {
        isSubmitting.value = false
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
    currentStep.value = 1
  }

  const onLoyaltyRedeemed = (discount: { amount: number, currency: string, points: number }) => {
    loyaltyDiscount.value = discount
  }

  const onLoyaltyCleared = () => {
    loyaltyDiscount.value = null
  }

  const nextStep = async () => {
    if (currentStep.value === 0) {
      currentStep.value = 1
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
  }
}
