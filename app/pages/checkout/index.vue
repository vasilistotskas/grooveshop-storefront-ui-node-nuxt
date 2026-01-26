<script lang="ts" setup>
import * as z from 'zod'

const { fetch } = useUserSession()
const localePath = useLocalePath()

const cartStore = useCartStore()
const { cleanCartState } = cartStore
const { getCartItems, hasStockIssues, cart } = storeToRefs(cartStore)

if (hasStockIssues.value) {
  navigateTo(localePath('cart'))
}

const { t, n, locale } = useI18n()
const toast = useToast()
const { $i18n } = useNuxtApp()

// Stock reservation composable
const { reserveStock, releaseReservations, createPaymentIntentFromCart } = useCheckout()

// State management
const currentStep = ref(0) // UStepper uses 0-based indexing
const checkoutMode = ref<'embedded' | 'hosted'>('hosted')
const useHostedCheckout = computed(() => checkoutMode.value === 'hosted')
const createdOrder = ref<OrderDetail | null>(null)
const selectedPayWay = useState<PayWay | null>('selectedPayWay', () => null)
const isSubmitting = ref(false)
const reservationIds = ref<number[]>([])
const retryCount = ref(0)
const MAX_RETRIES = 3
const paymentIntentId = ref<string | null>(null) // Store payment intent ID for Stripe

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

// Form state
const formState = reactive({
  // Personal Info
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  // Address
  country: '',
  countryId: undefined as string | undefined,
  region: '',
  regionId: undefined as string | undefined,
  city: '',
  place: '',
  zipcode: '',
  street: '',
  streetNumber: '',
  customerNotes: '',
  // Payment
  payWay: undefined as number | undefined,
  payWayId: undefined as number | undefined,
  documentType: zDocumentTypeEnum.enum.RECEIPT,
  items: getCartItems.value.map(item => ({
    product: item.product.id,
    quantity: item.quantity,
  })),
})

const regions = ref<Pagination<Region> | null>(null)

// Fetch data
const { data: shippingSetting } = await useFetch('/api/settings/get', {
  key: 'CHECKOUT_SHIPPING_PRICE',
  method: 'GET',
  headers: useRequestHeaders(),
  query: { key: 'CHECKOUT_SHIPPING_PRICE' },
})

const { data: freeShippingThresholdSetting } = await useFetch('/api/settings/get', {
  key: 'FREE_SHIPPING_THRESHOLD',
  method: 'GET',
  headers: useRequestHeaders(),
  query: { key: 'FREE_SHIPPING_THRESHOLD' },
})

const { data: countries } = await useFetch('/api/countries', {
  key: 'countries',
  method: 'GET',
  headers: useRequestHeaders(),
  query: { languageCode: locale },
})

const { data: payWays } = await useFetch('/api/pay-way', {
  key: 'payWays',
  method: 'GET',
  headers: useRequestHeaders(),
  query: { languageCode: locale },
})

// Initialize payment method
if (payWays.value?.results?.[0]) {
  formState.payWay = payWays.value.results[0].id
  formState.payWayId = payWays.value.results[0].id
  selectedPayWay.value = payWays.value.results[0]
}

// Initialize first country and fetch its regions on mount
onMounted(async () => {
  if (countries.value?.results?.[0] && !formState.country) {
    formState.country = countries.value.results[0].alpha2
    formState.countryId = countries.value.results[0].alpha2
    await fetchRegions()
  }
})

// Watch for payment method changes and update selectedPayWay
watch(() => formState.payWay, (newPayWayId) => {
  if (newPayWayId && payWays.value?.results) {
    const payWay = payWays.value.results.find(pw => pw.id === newPayWayId)
    if (payWay) {
      selectedPayWay.value = payWay
      formState.payWayId = payWay.id
    }
  }
})

// Watch for region changes and update regionId
watch(() => formState.region, (newRegionAlpha) => {
  if (newRegionAlpha && regions.value?.results) {
    const selectedRegion = regions.value.results.find(r => r.alpha === newRegionAlpha)
    if (selectedRegion) {
      formState.regionId = selectedRegion.alpha
    }
  }
  else {
    formState.regionId = undefined
  }
})

// Computed properties
const shippingPrice = computed(() => {
  if (!shippingSetting?.value) return 0

  const baseShippingCost = parseFloat(shippingSetting.value?.value)
  const freeShippingThreshold = freeShippingThresholdSetting?.value
    ? parseFloat(freeShippingThresholdSetting.value?.value)
    : 50.00

  const cartTotal = cart.value?.totalPrice || 0

  // Apply free shipping if cart total meets or exceeds threshold
  if (cartTotal >= freeShippingThreshold) {
    return 0
  }

  return baseShippingCost
})

const isStripePayment = computed(() => {
  return selectedPayWay.value?.providerCode === 'stripe'
})

const countryOptions = computed(() => {
  return countries.value?.results?.map(country => ({
    label: extractTranslated(country, 'name', locale.value),
    value: country.alpha2,
  })) || []
})

const regionOptions = computed(() => {
  return regions.value?.results?.map(region => ({
    label: extractTranslated(region, 'name', locale.value),
    value: region.alpha,
  })) || []
})

const payWayOptions = computed(() => {
  return payWays.value?.results?.map((payWay) => {
    const payWayName = extractTranslated(payWay, 'name', locale.value)
    let payWayNameLocalized = payWayName // fallback to original name

    if (payWayName === 'PAY_ON_DELIVERY') {
      payWayNameLocalized = t('payOnDelivery')
    }
    else if (payWayName === 'STRIPE') {
      payWayNameLocalized = t('cardPayment')
    }

    // Calculate cost display based on free threshold
    const cartTotal = cart.value?.totalPrice || 0
    const threshold = payWay.freeThreshold || 0
    const displayCost = (threshold > 0 && cartTotal >= threshold) ? 0 : payWay.cost

    return {
      label: `${payWayNameLocalized} (+${n(displayCost, 'currency')})`,
      value: payWay.id,
      mainImagePath: payWay.mainImagePath,
    }
  }) || []
})

// Validation schemas (Zod v4 syntax)
const step1Schema = z.object({
  firstName: z.string({ error: $i18n.t('validation.required') }).min(3, {
    error: $i18n.t('validation.first_name.min', { min: 3 }),
  }),
  lastName: z.string({ error: $i18n.t('validation.required') }).min(3, {
    error: $i18n.t('validation.last_name.min', { min: 3 }),
  }),
  email: z.email({ error: $i18n.t('validation.email.valid') }),
  phone: z.string({ error: $i18n.t('validation.required') }).min(3, {
    error: $i18n.t('validation.phone.min', { min: 3 }),
  }),
  country: z.string({ error: $i18n.t('validation.required') }).min(1, {
    error: $i18n.t('validation.required'),
  }),
  region: z.string({ error: $i18n.t('validation.required') }).min(1, {
    error: $i18n.t('validation.required'),
  }),
  city: z.string({ error: $i18n.t('validation.required') }).min(3, {
    error: $i18n.t('validation.city.min', { min: 3 }),
  }),
  place: z.string({ error: $i18n.t('validation.required') }).min(3, {
    error: $i18n.t('validation.place.min', { min: 3 }),
  }),
  zipcode: z.string({ error: $i18n.t('validation.required') }).min(3, {
    error: $i18n.t('validation.zipcode.min', { min: 3 }),
  }),
  street: z.string({ error: $i18n.t('validation.required') }).min(3, {
    error: $i18n.t('validation.street.min', { min: 3 }),
  }),
  streetNumber: z.string({ error: $i18n.t('validation.required') }).min(1, {
    error: $i18n.t('validation.street_number.min', { min: 1 }),
  }),
  customerNotes: z.string().optional(),
})

const step2Schema = z.object({
  payWay: z.number({ error: $i18n.t('validation.payment_method.required') }).min(1, {
    error: $i18n.t('validation.payment_method.required'),
  }),
})

// Functions
const fetchRegions = async () => {
  try {
    const countryValue = formState.country
    regions.value = await $fetch<ListRegionResponse>('/api/regions', {
      method: 'GET',
      query: {
        country: countryValue || undefined,
        languageCode: locale.value,
      },
    })
  }
  catch {
    toast.add({
      title: $i18n.t('error.default'),
      description: t('error_occurred'),
      color: 'error',
    })
  }
}

const onCountryChange = async () => {
  formState.region = ''
  formState.regionId = undefined

  // Update countryId when country changes
  if (formState.country && countries.value?.results) {
    const selectedCountry = countries.value.results.find(c => c.alpha2 === formState.country)
    if (selectedCountry) {
      formState.countryId = selectedCountry.alpha2
    }
  }

  await fetchRegions()
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

const handleOrderError = (response: any) => {
  let errorTitle = t('form.submit.error.general')
  let errorDescription = undefined

  // The error data can be in response._data or response.data depending on context
  const errorData = response._data || response.data

  // The actual error details might be nested in errorData.data or errorData
  const actualErrorData = errorData?.data || errorData

  // Check for error type in actualErrorData.error.type (new format)
  const errorType = actualErrorData?.error?.type

  if (errorType === 'invalid_order_data') {
    const detail = actualErrorData?.detail || ''

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
  // Handle ValidationError with errors.cart array (insufficient stock from validation)
  else if (actualErrorData?.errors?.cart && Array.isArray(actualErrorData.errors.cart)) {
    const cartErrors = actualErrorData.errors.cart
    if (cartErrors.length > 0) {
      const errorMsg = cartErrors[0]
      // Check if it's an insufficient stock error
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
  // Handle new error types from the audit implementation (legacy code field)
  else if (actualErrorData?.code) {
    switch (actualErrorData.code) {
      case 'insufficient_stock':
        errorTitle = t('form.submit.error.insufficient_stock')
        errorDescription = t('form.submit.error.insufficient_stock_description', {
          product: actualErrorData.product_name || t('product'),
          available: actualErrorData.available || 0,
        })
        break
      case 'payment_failed':
        errorTitle = t('form.submit.error.payment_failed')
        errorDescription = actualErrorData.detail || t('form.submit.error.payment_failed_description')
        break
      case 'stock_reservation_error':
        errorTitle = t('form.submit.error.stock_reservation')
        errorDescription = actualErrorData.detail || t('form.submit.error.stock_reservation_description')
        break
      case 'payment_verification_error':
        errorTitle = t('form.submit.error.payment_verification')
        errorDescription = actualErrorData.detail || t('form.submit.error.payment_verification_description')
        break
      default:
        errorTitle = t('form.submit.error.general')
        errorDescription = actualErrorData.detail || actualErrorData.message
    }
  }
  // Handle legacy stock errors (array format)
  else if (actualErrorData?.data?.items && Array.isArray(actualErrorData.data.items)) {
    const stockErrors: string[] = []
    actualErrorData.data.items.forEach((item: any) => {
      if (item?.quantity && Array.isArray(item.quantity)) {
        item.quantity.forEach((error: string) => {
          stockErrors.push(error)
        })
      }
    })
    if (stockErrors.length > 0) {
      errorTitle = t('form.submit.error.inventory')
      errorDescription = stockErrors.join('. ')
    }
  }
  else if (actualErrorData?.detail) {
    errorTitle = t('form.submit.error.general')
    errorDescription = actualErrorData.detail
  }
  else if (actualErrorData?.message) {
    errorTitle = t('form.submit.error.general')
    errorDescription = actualErrorData.message
  }

  return { title: errorTitle, description: errorDescription, shouldRetry: false }
}

const onSubmit = async () => {
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

        // Only show toast on first attempt, not during retries
        if (retryCount.value === 0) {
          toast.add({
            title: t('stock_reserved'),
            description: t('stock_reserved_description'),
            color: 'info',
          })
        }
      }
      catch (error: any) {
        // Handle stock reservation errors with structured data
        if (error.code === 'insufficient_stock' && error.failedItems) {
          stockError.value = {
            show: true,
            failedItems: error.failedItems,
          }

          // Scroll to top to show the error alert
          window.scrollTo({ top: 0, behavior: 'smooth' })
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

    // Step 3: Branch based on payment type (online vs offline)
    if (isStripePayment.value) {
      // Online payment flow: Payment-first (requires payment_intent_id)
      await handleOnlinePaymentFlow()
    }
    else {
      // Offline payment flow: Order-first (no payment_intent_id required)
      await handleOfflinePaymentFlow()
    }
  }
  catch (error: any) {
    // Only show error if it wasn't already handled by onResponseError
    // $fetch errors with response are handled in onResponseError callback
    if (!error.response && !error.data) {
      console.error('Checkout error:', error)
      toast.add({
        title: t('form.submit.error.general'),
        description: error.message || t('error_occurred'),
        color: 'error',
      })
    }
  }
  finally {
    isSubmitting.value = false
  }
}

const handleOnlinePaymentFlow = async () => {
  // For online payments (Stripe), we need to:
  // 1. Create payment intent from cart FIRST
  // 2. Create order with payment_intent_id (order will be PENDING)
  // 3. Stripe webhooks will update order status after payment confirmation

  try {
    // Step 1: Create payment intent from cart if not already created
    if (!paymentIntentId.value) {
      const cartId = cart.value?.uuid || cart.value?.id
      if (!cartId) {
        throw new Error('Cart not found')
      }

      const paymentIntent = await createPaymentIntentFromCart(cartId, formState.payWayId!)
      paymentIntentId.value = paymentIntent.paymentIntentId

      toast.add({
        title: t('payment_intent_created'),
        description: t('payment_intent_created_description'),
        color: 'info',
      })
    }

    // Step 2: Create order with payment_intent_id
    const submitValues: OrderCreateFromCartRequest = {
      payWayId: formState.payWayId!,
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
      paymentIntentId: paymentIntentId.value, // Include payment intent ID
    }

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
        const errorInfo = handleOrderError(response)

        // If it's an expired reservation error, silently retry without showing error
        if (errorInfo.shouldRetry) {
          // Check retry limit
          if (retryCount.value >= MAX_RETRIES) {
            // Max retries reached, show error
            toast.add({
              title: t('form.submit.error.general'),
              description: t('form.submit.error.max_retries'),
              color: 'error',
            })
            return
          }

          // Increment retry counter
          retryCount.value++

          // Silently retry after a short delay
          setTimeout(() => {
            onSubmit()
          }, 500)
        }
        else {
          // Show error toast only for non-recoverable errors
          toast.add({
            title: errorInfo.title,
            description: errorInfo.description,
            color: 'error',
          })
        }
      },
    })
  }
  catch (error: any) {
    // Error already handled in onResponseError, just prevent propagation
    console.error('Order creation failed:', error)
  }
}

const handleOfflinePaymentFlow = async () => {
  // For offline payments (Cash on Delivery, Bank Transfer),
  // we create the order directly without payment_intent_id
  const submitValues: OrderCreateFromCartRequest = {
    payWayId: formState.payWayId!,
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
  }

  try {
    await $fetch('/api/orders', {
      method: 'POST',
      headers: useRequestHeaders(),
      body: submitValues,
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
        await navigateTo(localePath({
          name: 'checkout-success-uuid',
          params: { uuid: response._data.uuid },
        }))
      },
      onResponseError({ response }) {
        const errorInfo = handleOrderError(response)

        // If it's an expired reservation error, automatically retry
        if (errorInfo.shouldRetry) {
          // Check retry limit
          if (retryCount.value >= MAX_RETRIES) {
            // Max retries reached, show error
            toast.add({
              title: t('form.submit.error.general'),
              description: t('form.submit.error.max_retries'),
              color: 'error',
            })
            return
          }

          // Increment retry counter
          retryCount.value++

          // Silently retry after a short delay
          setTimeout(() => {
            onSubmit()
          }, 500)
        }
        else {
          // Show error toast only for non-recoverable errors
          toast.add({
            title: errorInfo.title,
            description: errorInfo.description,
            color: 'error',
          })
        }
      },
    })
  }
  catch (error: any) {
    // Error already handled in onResponseError, just prevent propagation
    console.error('Order creation failed:', error)
  }
}

const onPaymentSuccess = async () => {
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
      toast.add({
        title: t('stock_released'),
        description: t('stock_released_description'),
        color: 'info',
      })
    }
    catch (err) {
      console.error('Failed to release reservations:', err)
    }
  }
}

const backToForm = () => {
  createdOrder.value = null
  selectedPayWay.value = null
  currentStep.value = 1
}

// Release reservations if user leaves checkout without completing
onBeforeUnmount(async () => {
  if (reservationIds.value.length > 0 && !createdOrder.value) {
    try {
      await releaseReservations(reservationIds.value)
      console.log('Released stock reservations on page leave')
    }
    catch (error) {
      console.error('Failed to release reservations:', error)
    }
  }
})

definePageMeta({
  layout: 'default',
  middleware: [
    async function () {
      const { $i18n } = useNuxtApp()
      const localePath = useLocalePath()
      const toast = useToast()
      let cart: CartDetail | null = null
      try {
        cart = await $fetch('/api/cart', {
          method: 'GET',
          headers: useRequestHeaders(),
        })
      }
      catch {
        toast.add({
          title: $i18n.t('error.default'),
          description: $i18n.t('error_occurred'),
          color: 'error',
        })
        return navigateTo(localePath('index'))
      }

      if (!cart?.items || cart?.items.length === 0) {
        toast.add({
          title: $i18n.t('cart_empty'),
          color: 'error',
        })
        return navigateTo(localePath('index'))
      }
    },
  ],
})
</script>

<template>
  <PageWrapper class="max-w-6xl">
    <div class="flex flex-col gap-8 pt-2 md:pt-4 lg:flex-row">
      <!-- Main Content -->
      <div class="flex-1">
        <!-- Stock Error Alert -->
        <UAlert
          v-if="stockError?.show"
          color="warning"
          variant="soft"
          :title="t('stock_error.title')"
          :description="t('stock_error.description')"
          icon="i-heroicons-exclamation-triangle"
          :close="{ variant: 'link' }"
          class="mb-6"
          @update:open="(value) => { if (!value) stockError = null }"
        >
          <template #description>
            <div class="space-y-3">
              <p class="text-sm">
                {{ t('stock_error.description') }}
              </p>

              <!-- Failed Items List -->
              <div class="space-y-2">
                <div
                  v-for="item in stockError.failedItems"
                  :key="item.productId"
                  class="rounded-lg bg-warning-50 dark:bg-warning-950/50 p-3"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-warning-900 dark:text-warning-100 truncate">
                        {{ item.productName }}
                      </p>
                      <p class="text-sm text-warning-700 dark:text-warning-300 mt-1">
                        {{ t('stock_error.requested_vs_available', {
                          requested: item.requested,
                          available: item.available,
                        }) }}
                      </p>
                    </div>
                    <UBadge color="warning" variant="subtle">
                      {{ t('stock_error.shortage', { count: item.requested - item.available }) }}
                    </UBadge>
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex flex-wrap gap-2 pt-2">
                <UButton
                  color="neutral"
                  variant="outline"
                  icon="i-heroicons-shopping-cart"
                  :to="localePath('cart')"
                >
                  {{ t('stock_error.update_cart') }}
                </UButton>
                <UButton
                  color="neutral"
                  variant="outline"
                  icon="i-heroicons-arrow-path"
                  @click="() => { stockError = null; onSubmit() }"
                >
                  {{ t('stock_error.retry') }}
                </UButton>
              </div>
            </div>
          </template>
        </UAlert>
        <!-- Stepper -->
        <UStepper
          v-model="currentStep"
          :items="[
            { title: t('steps.info_and_address'), icon: 'i-heroicons-user-circle' },
            { title: t('steps.payment'), icon: 'i-heroicons-credit-card' },
          ]"
          class="mb-6"
        />

        <!-- Payment Success View -->
        <UCard v-if="createdOrder && isStripePayment" variant="soft">
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold">
                  {{ t('complete_payment') }}
                </h2>
                <p class="text-sm text-primary-950 dark:text-primary-50">
                  {{ t('order_created_complete_payment') }}
                </p>
              </div>
              <UButton
                variant="ghost"
                icon="i-heroicons-arrow-left"
                size="sm"
                @click="backToForm"
              >
                {{ t('back_to_form') }}
              </UButton>
            </div>
          </template>

          <div class="space-y-6">
            <div class="rounded-lg bg-elevated/70 p-4">
              <h3 class="mb-2 font-medium">
                {{ t('order_summary') }}
              </h3>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span>{{ t('order_number') }}:</span>
                  <span class="font-medium">#{{ createdOrder?.id }}</span>
                </div>
                <div class="flex justify-between">
                  <span>{{ t('total_amount') }}:</span>
                  <span class="font-medium">
                    {{ createdOrder?.pricingBreakdown?.grandTotal }}
                    {{ createdOrder?.pricingBreakdown?.currency }}
                  </span>
                </div>
              </div>
            </div>

            <StripeCheckout
              v-if="useHostedCheckout"
              :order="createdOrder"
              :pay-way="selectedPayWay!"
              @error="onPaymentError"
              @redirecting="() => toast.add({ title: t('redirecting'), color: 'info' })"
            />

            <StripePayment
              v-else
              :order="createdOrder"
              :pay-way="selectedPayWay!"
              @success="onPaymentSuccess"
              @error="onPaymentError"
            />
          </div>
        </UCard>

        <!-- Step 1: Personal Info & Address -->
        <UCard v-else-if="currentStep === 0" class="overflow-hidden">
          <template #header>
            <h2 class="text-xl font-semibold">
              {{ t('steps.info_and_address') }}
            </h2>
          </template>

          <UForm :state="formState" :schema="step1Schema" class="space-y-6" @submit="nextStep">
            <!-- Personal Information Section -->
            <div class="space-y-4">
              <h3 class="text-lg font-medium text-primary-900 dark:text-primary-100">
                {{ t('personal_information') }}
              </h3>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <UFormField :label="t('form.first_name')" name="firstName" required class="[&_label]:sr-only">
                  <UInput
                    v-model="formState.firstName"
                    :placeholder="t('form.first_name')"
                    size="xl"
                    autocomplete="given-name"
                    class="w-full"
                  />
                </UFormField>

                <UFormField :label="t('form.last_name')" name="lastName" required class="[&_label]:sr-only">
                  <UInput
                    v-model="formState.lastName"
                    :placeholder="t('form.last_name')"
                    size="xl"
                    autocomplete="family-name"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <UFormField :label="t('form.email')" name="email" required class="[&_label]:sr-only">
                  <UInput
                    v-model="formState.email"
                    type="email"
                    :placeholder="t('form.email')"
                    size="xl"
                    autocomplete="email"
                    leading-icon="i-heroicons-envelope"
                    class="w-full"
                  />
                </UFormField>

                <UFormField :label="t('form.phone')" name="phone" required class="[&_label]:sr-only">
                  <UInput
                    v-model="formState.phone"
                    type="tel"
                    :placeholder="t('form.phone')"
                    size="xl"
                    autocomplete="tel"
                    leading-icon="i-heroicons-phone"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </div>

            <USeparator />

            <!-- Address Section -->
            <div class="space-y-4">
              <h3 class="text-lg font-medium text-primary-900 dark:text-primary-100">
                {{ t('delivery_address') }}
              </h3>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <UFormField :label="t('form.country')" name="country" required class="[&_label]:sr-only">
                  <USelect
                    v-model="formState.country"
                    :items="countryOptions"
                    :placeholder="t('form.country')"
                    size="xl"
                    class="w-full"
                    @update:model-value="onCountryChange"
                  />
                </UFormField>

                <UFormField :label="t('form.region')" name="region" required class="[&_label]:sr-only">
                  <USelect
                    v-model="formState.region"
                    :items="regionOptions"
                    :placeholder="t('form.region')"
                    size="xl"
                    class="w-full"
                    :disabled="!regionOptions.length"
                  />
                </UFormField>
              </div>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <UFormField :label="t('form.city')" name="city" required class="[&_label]:sr-only">
                  <UInput
                    v-model="formState.city"
                    :placeholder="t('form.city')"
                    size="xl"
                    autocomplete="address-level2"
                    leading-icon="i-heroicons-building-office-2"
                    class="w-full"
                  />
                </UFormField>

                <UFormField :label="t('form.place')" name="place" required class="[&_label]:sr-only">
                  <UInput
                    v-model="formState.place"
                    :placeholder="t('form.place')"
                    size="xl"
                    leading-icon="i-heroicons-map-pin"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                <UFormField :label="t('form.street')" name="street" required class="md:col-span-2 [&_label]:sr-only">
                  <UInput
                    v-model="formState.street"
                    :placeholder="t('form.street')"
                    size="xl"
                    autocomplete="address-line1"
                    class="w-full"
                  />
                </UFormField>

                <UFormField :label="t('form.street_number')" name="streetNumber" required class="[&_label]:sr-only">
                  <UInput
                    v-model="formState.streetNumber"
                    :placeholder="t('form.street_number')"
                    size="xl"
                    autocomplete="address-line2"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <UFormField :label="t('form.zipcode')" name="zipcode" required class="[&_label]:sr-only">
                <UInput
                  v-model="formState.zipcode"
                  :placeholder="t('form.zipcode')"
                  size="xl"
                  autocomplete="postal-code"
                  class="w-full"
                />
              </UFormField>

              <UFormField :label="t('form.customer_notes')" name="customerNotes" class="[&_label]:sr-only">
                <UTextarea
                  v-model="formState.customerNotes"
                  :placeholder="t('form.customer_notes')"
                  :rows="3"
                  size="xl"
                  autoresize
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="flex justify-end pt-4">
              <UButton
                type="submit"
                size="lg"
                color="success"
                icon="i-heroicons-arrow-right"
                trailing
              >
                {{ t('continue_to_payment') }}
              </UButton>
            </div>
          </UForm>
        </UCard>

        <!-- Step 2: Payment -->
        <UCard v-else-if="currentStep === 1" class="overflow-hidden">
          <template #header>
            <h2 class="text-xl font-semibold">
              {{ t('steps.payment') }}
            </h2>
          </template>

          <UForm :state="formState" :schema="step2Schema" class="space-y-6" @submit="onSubmit">
            <UFormField
              :label="t('form.payment_method')"
              name="payWay"
              required
              :ui="{
                label: `
                  text-lg font-medium text-primary-900
                  dark:text-primary-100
                `,
                wrapper: 'mb-2',
              }"
            >
              <URadioGroup
                v-model="formState.payWay"
                :items="payWayOptions"
                variant="card"
                size="xl"
                class="w-full"
                :ui="{
                  item: 'flex cursor-pointer items-center',
                  wrapper: 'ms-4',
                }"
              >
                <template #label="{ item }">
                  <div class="flex items-center justify-between gap-3">
                    <span class="font-medium">{{ item.label }}</span>
                    <div
                      v-if="item.mainImagePath"
                      class="
                        flex size-12 shrink-0 items-center justify-center
                        overflow-hidden rounded-lg
                      "
                    >
                      <ImgWithFallback
                        class="size-full object-contain dark:invert"
                        :style="{ contentVisibility: 'auto' }"
                        :src="item.mainImagePath"
                        :width="48"
                        :height="48"
                        fit="contain"
                        :format="'svg'"
                        :background="'transparent'"
                        :alt="`${item.label} payment method`"
                        densities="x1"
                      />
                    </div>
                  </div>
                </template>
              </URadioGroup>
            </UFormField>

            <div class="flex items-center justify-between pt-4">
              <UButton
                variant="ghost"
                icon="i-heroicons-arrow-left"
                type="button"
                @click="prevStep"
              >
                {{ t('back') }}
              </UButton>

              <UButton
                type="submit"
                size="lg"
                color="success"
                :loading="isSubmitting"
                :disabled="!formState.payWay"
              >
                {{ t('place_order') }}
              </UButton>
            </div>
          </UForm>
        </UCard>
      </div>

      <!-- Sidebar -->
      <div class="w-full lg:w-[400px]">
        <CheckoutSidebar
          :shipping-price="shippingPrice"
          :show-payment-fee="currentStep === 1"
        >
          <template #items>
            <CheckoutItems />
          </template>
        </CheckoutSidebar>
      </div>
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Ολοκλήρωση αγοράς
  payOnDelivery: Αντικαταβολή
  cardPayment: Πληρωμή με κάρτα
  personal_information: Προσωπικά Στοιχεία
  delivery_address: Διεύθυνση Παράδοσης
  validation_error: Σφάλμα επικύρωσης
  back: Πίσω
  place_order: Ολοκλήρωση Παραγγελίας
  complete_payment: Ολοκλήρωση Πληρωμής
  order_created_complete_payment: Η παραγγελία δημιουργήθηκε. Ολοκλήρωσε την πληρωμή για να ολοκληρώσεις την παραγγελία.
  order_created_payment_required: Παραγγελία δημιουργήθηκε
  complete_payment_to_finish: Ολοκληρώστε την πληρωμή για να ολοκληρώσεις την παραγγελία
  back_to_form: Επιστροφή
  order_summary: Σύνοψη Παραγγελίας
  order_number: Αριθμός παραγγελίας
  total_amount: Συνολικό ποσό
  payment_successful: Η πληρωμή ολοκληρώθηκε με επιτυχία
  order_completed_successfully: Η παραγγελία ολοκληρώθηκε με επιτυχία
  payment_failed: Η πληρωμή απέτυχε
  redirecting: Μεταφορά στην σελίδα πληρωμής
  stock_reserved: Το απόθεμα κρατήθηκε
  stock_reserved_description: Τα προϊόντα σου είναι κρατημένα για 15 λεπτά
  stock_released: Το απόθεμα απελευθερώθηκε
  stock_released_description: Τα προϊόντα είναι πλέον διαθέσιμα για άλλους πελάτες
  retrying: Επανάληψη
  creating_new_reservation: Δημιουργία νέας κράτησης...
  payment_intent_created: Πληρωμή προετοιμάστηκε
  payment_intent_created_description: Η πληρωμή σας είναι έτοιμη για επεξεργασία
  stock_error:
    title: Ανεπαρκές Απόθεμα
    description: Ορισμένα προϊόντα στο καλάθι σου δεν έχουν επαρκές απόθεμα για να ολοκληρωθεί η παραγγελία.
    requested_vs_available: 'Ζητήθηκαν: {requested} | Διαθέσιμα: {available}'
    shortage: '-{count}'
    update_cart: Ενημέρωση Καλαθιού
    retry: Δοκιμή Ξανά
  steps:
    info_and_address: Στοιχεία & Διεύθυνση
    payment: Πληρωμή
  form:
    select_placeholder: Επέλεξε
    first_name: Όνομα
    last_name: Επίθετο
    email: Email
    phone: Τηλέφωνο
    place: Περιοχή
    city: Πόλη
    zipcode: Ταχυδρομικός Κώδικας
    country: Χώρα
    region: Περιφέρεια
    street: Οδός
    street_number: Αριθμός Οδού
    customer_notes: Σημειώσεις
    payment_method: Τρόπος πληρωμής
    submit:
      success: Η παραγγελία δημιουργήθηκε με επιτυχία
      error:
        general: Σφάλμα δημιουργίας παραγγελίας
        inventory: Ανεπαρκές απόθεμα διαθέσιμο
        insufficient_stock: Ανεπαρκές απόθεμα
        insufficient_stock_description: Το προϊόν {product} έχει μόνο {available} διαθέσιμα τεμάχια
        payment_failed: Η πληρωμή απέτυχε
        payment_failed_description: Η πληρωμή δεν ολοκληρώθηκε. Παρακαλώ δοκιμάστε ξανά.
        invalid_order_data: Μη έγκυρα δεδομένα παραγγελίας
        invalid_order_data_description: Τα δεδομένα της παραγγελίας δεν είναι έγκυρα. Παρακαλώ ελέγξτε τα στοιχεία σας.
        reservation_expired: Η κράτηση έληξε
        reservation_expired_description: Η κράτηση του αποθέματος έληξε. Παρακαλώ δοκιμάστε ξανά.
        max_retries: Πολλές προσπάθειες
        stock_reservation: Σφάλμα κράτησης αποθέματος
        stock_reservation_description: Δεν ήταν δυνατή η κράτηση του αποθέματος. Παρακαλώ δοκιμάστε ξανά.
        payment_verification: Σφάλμα επαλήθευσης πληρωμής
        payment_verification_description: Η επαλήθευση της πληρωμής απέτυχε. Παρακαλώ επικοινωνήστε με την υποστήριξη.
  validation:
    required: Το πεδίο είναι υποχρεωτικό
    email:
      valid: Το email πρέπει να είναι έγκυρο
    first_name:
      min: Το όνομα πρέπει να έχει τουλάχιστον {min} χαρακτήρες
    last_name:
      min: Το επώνυμο πρέπει να έχει τουλάχιστον {min} χαρακτήρες
    street:
      min: Η οδός πρέπει να έχει τουλάχιστον {min} χαρακτήρες
    street_number:
      min: Ο αριθμός οδού πρέπει να έχει τουλάχιστον {min} χαρακτήρες
    zipcode:
      min: Ο ταχυδρομικός κώδικας πρέπει να έχει μήκος τουλάχιστον {min} χαρακτήρων
    place:
      min: Το μέρος πρέπει να έχει τουλάχιστον {min} χαρακτήρες
    city:
      min: Η πόλη πρέπει να έχει τουλάχιστον {min} χαρακτήρες
    phone:
      min: Το τηλέφωνο πρέπει να έχει τουλάχιστον {min} χαρακτήρες
    payment_method:
      required: Παρακαλώ επίλεξε τρόπο πληρωμής
</i18n>
