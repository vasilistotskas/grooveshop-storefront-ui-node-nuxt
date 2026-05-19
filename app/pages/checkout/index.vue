<script lang="ts" setup>
const { loggedIn } = useUserSession()
const localePath = useLocalePath()
const { t } = useI18n()
const route = useRoute()
const toast = useToast()
const config = useRuntimeConfig()
// Nuxt's runtimeConfig parser passes env values through destr(), which
// auto-coerces numeric strings to numbers ('10391' → 10391). Force the
// downstream prop type back to string so all the BoxNow components keep
// their strict `partnerId: string` typing.
const boxnowPartnerId = String(config.public.boxnowPartnerId ?? '')

const cartStore = useCartStore()
const { hasStockIssues, cart } = storeToRefs(cartStore)

watchEffect(() => {
  if (hasStockIssues.value) {
    navigateTo(localePath('cart'))
  }
})

// Handle return from payment provider after cancellation or failure.
// Viva Wallet and Stripe hosted checkout redirect back to this page with
// ?canceled=true or ?error=<code> when the user cancels or payment fails.
onMounted(() => {
  if (route.query.canceled) {
    toast.add({
      title: t('payment_canceled'),
      description: t('payment_canceled_description'),
      color: 'warning',
    })
  }
  else if (route.query.error) {
    toast.add({
      title: t('payment_error_title'),
      description: t('payment_error_description'),
      color: 'error',
    })
  }
})

const {
  formState,
  selectedPayWay,
  payWays,
  shippingPrice,
  countryOptions,
  regionOptions,
  payWayOptions,
  step1Schema,
  step2Schema,
  step3Schema,
  savedAddresses,
  selectedSavedAddressId,
  selectSavedAddress,
  addressEntryMode,
  useNewAddress,
  b2bInvoicingEnabled,
  boxnowEnabled,
  acsSmartpointEnabled,
  refetchShippingSettings,
} = await useCheckoutForm()

const {
  currentStep,
  createdOrder,
  isSubmitting,
  loyaltyDiscount,
  stockError,
  isStripePayment,
  isVivaWalletPayment,
  isOnlinePayment,
  useHostedCheckout,
  onSubmit,
  nextStep,
  prevStep,
  backToForm,
  onPaymentSuccess,
  onPaymentError,
  onLoyaltyRedeemed,
  onLoyaltyCleared,
  fireInitiateCheckout,
} = useCheckoutSubmit({ formState, selectedPayWay, payWays, refetchShippingSettings })

// Meta Pixel: InitiateCheckout fires once when the customer lands on
// the checkout page. The eventID is stashed inside useCheckoutSubmit
// so the order POST body forwards it to Django for server-side dedup.
onMounted(() => {
  fireInitiateCheckout()
})

// Summary of the selected shipping method, surfaced on the payment
// step in the right sidebar so the shopper can verify their pick
// without scrolling back. ``null`` on earlier steps so the alert
// stays hidden until shipping has actually been chosen.
const shippingSummary = computed(() => {
  if (currentStep.value !== 2) return null
  const method = formState.shippingMethod
  if (method === 'box_now_locker') {
    const locker = formState.boxnowLocker
    return {
      method,
      lockerName: locker?.boxnowLockerName ?? null,
      lockerId: formState.boxnowLockerId || locker?.boxnowLockerId || null,
      lockerAddress: locker?.boxnowLockerAddressLine1 ?? null,
    }
  }
  if (method === 'acs_smartpoint') {
    const station = formState.acsStation
    return {
      method,
      lockerName: station?.name ?? null,
      lockerId: formState.acsStationExternalId || null,
      lockerAddress: [station?.addressLine1, station?.city]
        .filter(Boolean)
        .join(', ') || null,
    }
  }
  return { method }
})

const handleStockRetry = () => {
  stockError.value = null
  onSubmit()
}

const onBoundaryError = (error: unknown) => {
  log.error({ action: 'checkout:boundary', error })
  toast.add({
    title: t('payment_error_title'),
    description: t('payment_error_description'),
    color: 'error',
  })
}

const handleBoundaryRetry = (error: unknown, clearError: () => void) => {
  log.warn('checkout:boundary-retry', String((error as Error)?.message ?? ''))
  clearError()
}

useSeoMeta({
  // The per-locale checkout file (i18n/locales/checkout/el-GR.json)
  // merges its keys at the root of the locale messages, so the
  // title lives at `title` — not under a `checkout.` namespace.
  // Using `t('checkout.title')` silently rendered the raw key.
  title: () => t('title'),
})

definePageMeta({
  layout: 'default',
  middleware: [
    function () {
      const { $i18n } = useNuxtApp()
      const t = $i18n.t.bind($i18n)
      const localePath = useLocalePath()
      const toast = useToast()
      // The cart store is already populated by the setup plugin before any
      // page renders (and before client-side navigations). Re-fetching here
      // via useRequestHeaders() is both redundant and unsafe — the composable
      // is not supported inside inline page middleware on the server.
      const cartStore = useCartStore()
      const cartItems = cartStore.cart?.items

      if (!cartItems || cartItems.length === 0) {
        toast.add({
          title: t('cart_empty'),
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
        <CheckoutStockErrorAlert
          v-if="stockError?.show"
          :stock-error="stockError"
          @dismiss="stockError = null"
          @retry="handleStockRetry"
        />

        <!-- Stepper. ``disabled`` blocks click-navigation on the step
             headers so the only way forward is the per-step "Συνέχεια"
             submit button, which runs the Zod schema for that step.
             The ref is still controlled via ``v-model`` from the
             ``nextStep``/``prevStep`` helpers in ``useCheckoutSubmit``. -->
        <UStepper
          v-model="currentStep"
          disabled
          :items="[
            { title: t('steps.info_and_address'), icon: 'i-heroicons-user-circle' },
            { title: t('shipping.method.title'), icon: 'i-heroicons-truck' },
            { title: t('steps.payment'), icon: 'i-heroicons-credit-card' },
          ]"
          class="mb-6"
        />

        <NuxtErrorBoundary @error="onBoundaryError">
          <!-- Online Payment View (Stripe or Viva Wallet) -->
          <CheckoutOnlinePaymentView
            v-if="createdOrder && isOnlinePayment"
            :created-order="createdOrder"
            :selected-pay-way="selectedPayWay!"
            :is-stripe-payment="isStripePayment"
            :is-viva-wallet-payment="isVivaWalletPayment"
            :use-hosted-checkout="useHostedCheckout"
            @payment-success="onPaymentSuccess"
            @payment-error="onPaymentError"
            @back-to-form="backToForm"
          />

          <!-- Step 0: Personal Info & Address -->
          <CheckoutStepPersonalInfo
            v-else-if="currentStep === 0"
            v-model:form-state="formState"
            :schema="step1Schema"
            :country-options="countryOptions"
            :region-options="regionOptions"
            :saved-addresses="savedAddresses"
            :selected-saved-address-id="selectedSavedAddressId"
            :mode="addressEntryMode"
            :b2b-invoicing-enabled="b2bInvoicingEnabled"
            @next="nextStep"
            @select-saved-address="selectSavedAddress"
            @use-new-address="useNewAddress"
          />

          <!-- Step 1: Shipping Method -->
          <CheckoutStepShipping
            v-else-if="currentStep === 1"
            v-model:form-state="formState"
            :schema="step2Schema"
            :partner-id="boxnowPartnerId"
            :boxnow-enabled="boxnowEnabled"
            :acs-smartpoint-enabled="acsSmartpointEnabled"
            :selected-pay-way="selectedPayWay"
            @next="nextStep"
            @back="prevStep"
          />

          <!-- Step 2: Payment -->
          <CheckoutStepPayment
            v-else-if="currentStep === 2"
            v-model:form-state="formState"
            :schema="step3Schema"
            :pay-way-options="payWayOptions"
            :is-submitting="isSubmitting"
            @submit="onSubmit"
            @back="prevStep"
          />

          <template #error="{ error, clearError }">
            <UAlert
              :title="t('payment_error_title')"
              :description="t('payment_error_description')"
              color="error"
              variant="subtle"
              icon="i-heroicons-exclamation-triangle"
              class="mb-4"
              :actions="[
                {
                  label: t('retry'),
                  color: 'neutral',
                  variant: 'outline',
                  onClick: () => handleBoundaryRetry(error, clearError),
                },
              ]"
            />
          </template>
        </NuxtErrorBoundary>
      </div>

      <!-- Sidebar -->
      <div class="w-full lg:w-[400px]">
        <div class="lg:sticky lg:top-4">
          <CheckoutSidebar
            :shipping-price="shippingPrice"
            :show-payment-fee="currentStep === 2"
            :loyalty-discount="loyaltyDiscount?.amount ?? 0"
            :shipping-summary="shippingSummary"
          >
            <template #items>
              <CheckoutItems />
            </template>

            <template #loyalty>
              <!-- Loyalty Points Redemption (logged in) -->
              <LoyaltyRedemption
                v-if="loggedIn"
                :currency="cart?.currency ?? 'EUR'"
                :max-discount-amount="cart?.totalPrice ?? 0"
                @redeemed="onLoyaltyRedeemed"
                @cleared="onLoyaltyCleared"
              />
              <!-- Guest CTA to sign up and earn points -->
              <CheckoutGuestLoyaltyCTA v-else />
            </template>

            <template #points-earned>
              <!-- Loyalty Points Earned Preview -->
              <CheckoutPointsEarned />
            </template>
          </CheckoutSidebar>
        </div>
      </div>
    </div>
  </PageWrapper>
</template>
