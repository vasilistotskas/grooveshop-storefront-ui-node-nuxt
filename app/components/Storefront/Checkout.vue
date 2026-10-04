<script lang="ts" setup>
const { loggedIn } = useUserSession()
const localePath = useLocalePath()
const { t, n } = useI18n()
const route = useRoute()
const toast = useToast()
const tenantStore = useTenantStore()
// BoxNow is tenant-only — no platform env fallback. Tenants that
// haven't configured a partner id simply don't get the locker-pickup
// option (StepShipping/BoxNowLockerPicker already disable/hide it when
// partnerId is empty).
const boxnowPartnerId = computed(() => tenantStore.boxNowPartnerId)

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
  selectedCountry,
  payWays,
  shippingPrice,
  countryOptions,
  postcodeExample,
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
  acsEnabled,
  refetchShippingOptions,
  shippingOptionsError,
  shippingOverWeight,
  retryShippingOptions,
  shippingOptions,
} = await useCheckoutForm()

const {
  currentStep,
  addressStepErrors,
  createdOrder,
  isSubmitting,
  loyaltyDiscount,
  giftCards,
  giftCardBalanceTotal,
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
  onGiftCardApplied,
  onGiftCardRemoved,
  fireInitiateCheckout,
} = useCheckoutSubmit({ formState, selectedPayWay, payWays, selectedCountry, refetchShippingOptions, shippingOverWeight })

// Meta Pixel: InitiateCheckout fires once when the customer lands on
// the checkout page. The eventID is stashed inside useCheckoutSubmit
// so the order POST body forwards it to Django for server-side dedup.
onMounted(() => {
  fireInitiateCheckout()
})

const handleStockRetry = () => {
  stockError.value = null
  onSubmit()
}

// The active step exposes `submit()` (StepPersonalInfo / StepShipping /
// StepPayment): it validates the step and moves on. The page's primary
// button calls it, so the per-step Zod schema gates every forward move.
const stepRef = ref<{ submit: () => void | Promise<void> } | null>(null)

// What the order costs — the summary's own figures, named on "Pay …".
const { total } = useCheckoutTotals({
  shippingPrice: () => shippingPrice.value,
  includeShipping: () => currentStep.value >= 1 && Boolean(formState.shippingMethod),
  includePaymentFee: () => currentStep.value === 2,
  loyaltyDiscount: () => loyaltyDiscount.value?.amount ?? 0,
  giftCardBalance: () => giftCardBalanceTotal.value,
})

const ctaLabel = computed(() => {
  if (currentStep.value === 0) return t('continue_to_delivery')
  if (currentStep.value === 1) return t('continue_to_payment')
  return isOnlinePayment.value ? t('pay', { total: n(total.value, 'currency') }) : t('place_order')
})

// The online-payment view owns the main column once the order exists:
// it has its own Pay / Back controls.
const showNavigation = computed(() => !(createdOrder.value && isOnlinePayment.value))

const onCta = async () => {
  await stepRef.value?.submit()
}

// Click handler for the stepper headers. The stepper itself is no
// longer ``disabled``, so headers receive native clicks — but we
// can't let raw clicks bypass Zod. Backward jumps are free (the
// shopper has already passed the checks for prior steps); forward
// jumps route through the active step's ``submit()`` so the
// per-step schema gates the advance exactly like the sidebar CTA.
// Reka's ``linear: true`` already blocks 2-step skips forward, so
// only the immediate-next case needs handling.
const onStepperUpdate = async (target: number | string | undefined) => {
  if (typeof target !== 'number') return
  if (target === currentStep.value) return
  if (target < currentStep.value) {
    currentStep.value = target
    return
  }
  await stepRef.value?.submit()
}

// After every step change snap the viewport to the absolute top.
// On mobile the sidebar CTA lives below the order summary; firing it
// leaves the viewport at the bottom of the page, so the user lands
// on the new step's bottom edge and has to scroll back up to start
// filling the form. ``scrollIntoView({ block: 'start' })`` was the
// first attempt but the layout's ``sticky top-0`` header overlapped
// the stepper, so the user landed slightly below the page top. A
// plain ``window.scrollTo(0, 0)`` puts them at the unambiguous top
// of the page (just under the sticky header) every time.
watch(currentStep, async () => {
  if (!import.meta.client) return
  await nextTick()
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

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
</script>

<template>
  <div class="flex flex-1 flex-col">
    <UContainer class="flex w-full flex-1 flex-col gap-6 py-6 lg:gap-8 lg:py-8">
      <!-- The page's heading for assistive tech; the progress strip carries
           the wayfinding on screen. -->
      <PageTitle
        :text="t('title')"
        class="sr-only"
      />

      <!-- Clicks go through `onStepperUpdate`: backward jumps are free, a
           forward one runs the active step's validation first. -->
      <CheckoutProgressSteps
        :current="currentStep"
        :payment-chosen="Boolean(formState.payWay)"
        @select="onStepperUpdate"
      />

      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start lg:gap-14">
        <div class="flex min-w-0 flex-col gap-6">
          <CheckoutStockErrorAlert
            v-if="stockError?.show"
            :stock-error="stockError"
            @dismiss="stockError = null"
            @retry="handleStockRetry"
          />

          <NuxtErrorBoundary @error="onBoundaryError">
            <!-- Stripe or Viva Wallet, once the order exists. -->
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

            <CheckoutStepPersonalInfo
              v-else-if="currentStep === 0"
              ref="stepRef"
              v-model:form-state="formState"
              :schema="step1Schema"
              :country-options="countryOptions"
              :postcode-example="postcodeExample"
              :selected-country="selectedCountry"
              :server-errors="addressStepErrors"
              :region-options="regionOptions"
              :saved-addresses="savedAddresses"
              :selected-saved-address-id="selectedSavedAddressId"
              :mode="addressEntryMode"
              :b2b-invoicing-enabled="b2bInvoicingEnabled"
              :acs-enabled="acsEnabled"
              @next="nextStep"
              @select-saved-address="selectSavedAddress"
              @use-new-address="useNewAddress"
            />

            <CheckoutStepShipping
              v-else-if="currentStep === 1"
              ref="stepRef"
              v-model:form-state="formState"
              :schema="step2Schema"
              :partner-id="boxnowPartnerId"
              :api-options="shippingOptions"
              :options-error="shippingOptionsError"
              :over-weight="shippingOverWeight"
              @next="nextStep"
              @back="prevStep"
              @retry-options="retryShippingOptions"
            />

            <CheckoutStepPayment
              v-else-if="currentStep === 2"
              ref="stepRef"
              v-model:form-state="formState"
              :schema="step3Schema"
              :pay-way-options="payWayOptions"
              :is-submitting="isSubmitting"
              :use-hosted-checkout="useHostedCheckout"
              @submit="onSubmit"
            />

            <template #error="{ error, clearError }">
              <UAlert
                :title="t('payment_error_title')"
                :description="t('payment_error_description')"
                :actions="[{
                  label: t('retry'),
                  color: 'neutral',
                  variant: 'outline',
                  onClick: () => handleBoundaryRetry(error, clearError),
                }]"
                icon="i-lucide-triangle-alert"
                color="error"
                variant="soft"
              />
            </template>
          </NuxtErrorBoundary>

          <div
            v-if="showNavigation"
            class="flex items-center justify-between gap-3"
          >
            <UButton
              v-if="currentStep > 0"
              :label="t('back')"
              icon="i-lucide-chevron-left"
              color="neutral"
              variant="ghost"
              size="lg"
              @click="prevStep"
            />
            <span v-else />
            <UButton
              :label="ctaLabel"
              :icon="currentStep === 2 ? 'i-lucide-lock' : undefined"
              :trailing-icon="currentStep === 2 ? undefined : 'i-lucide-arrow-right'"
              :color="currentStep === 2 ? 'secondary' : 'neutral'"
              :loading="isSubmitting"
              :disabled="currentStep === 2 && !formState.payWay"
              size="xl"
              data-testid="checkout-cta"
              class="max-sm:flex-1 max-sm:justify-center"
              @click="onCta"
            />
          </div>
        </div>

        <div class="lg:sticky lg:top-[calc(var(--ui-header-height)+1.5rem)]">
          <CheckoutSidebar
            :shipping-price="shippingPrice"
            :include-shipping="currentStep >= 1 && Boolean(formState.shippingMethod)"
            :show-payment-fee="currentStep === 2"
            :loyalty="loyaltyDiscount"
            :gift-card-balance="giftCardBalanceTotal"
          >
            <template #items>
              <CheckoutItems />
            </template>

            <!-- As the boards draw it: codes and gift cards while the shopper
                 fills in the order, points on the payment page. -->
            <template
              v-if="currentStep < 2"
              #coupon
            >
              <CheckoutCouponInput />
            </template>

            <template
              v-if="currentStep < 2"
              #gift-card
            >
              <CheckoutGiftCardInput
                :applied-cards="giftCards"
                @applied="onGiftCardApplied"
                @removed="onGiftCardRemoved"
              />
            </template>

            <template
              v-if="currentStep === 2"
              #loyalty
            >
              <CheckoutPointsPanel
                v-if="loggedIn"
                :currency="cart?.currency ?? 'EUR'"
                :max-discount-amount="cart?.totalPrice ?? 0"
                :redemption="loyaltyDiscount"
                @redeemed="onLoyaltyRedeemed"
                @cleared="onLoyaltyCleared"
              />
              <CheckoutGuestLoyaltyCTA v-else />
            </template>

            <template #points-earned>
              <CheckoutPointsEarned />
            </template>
          </CheckoutSidebar>
        </div>
      </div>
    </UContainer>

    <CheckoutLegalFooter />
  </div>
</template>
