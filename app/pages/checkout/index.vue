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
  refetchShippingSettings,
  shippingOptions,
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
//
// ``logoUrl`` is sourced from the matching ``/api/v1/shipping/options``
// row (the same source the picker uses) so the sidebar mirrors what
// the shopper saw at step 2 — and the operator gets a single edit
// surface in Django admin that propagates everywhere.
const shippingLogoUrl = computed(() => {
  const method = formState.shippingMethod
  if (!method) return null
  const match = shippingOptions.value.find(
    o => methodKeyForOption(o) === method,
  )
  return match?.logoUrl ?? null
})

const shippingSummary = computed(() => {
  if (currentStep.value !== 2) return null
  const method = formState.shippingMethod
  const logoUrl = shippingLogoUrl.value
  if (method === 'box_now_locker') {
    const locker = formState.boxnowLocker
    return {
      method,
      logoUrl,
      lockerName: locker?.boxnowLockerName ?? null,
      lockerId: formState.boxnowLockerId || locker?.boxnowLockerId || null,
      lockerAddress: locker?.boxnowLockerAddressLine1 ?? null,
    }
  }
  if (method === 'acs_smartpoint') {
    const station = formState.acsStation
    return {
      method,
      logoUrl,
      lockerName: station?.name ?? null,
      lockerId: formState.acsStationExternalId || null,
      lockerAddress: [station?.addressLine1, station?.city]
        .filter(Boolean)
        .join(', ') || null,
    }
  }
  return { method, logoUrl }
})

const handleStockRetry = () => {
  stockError.value = null
  onSubmit()
}

// Active step component exposes `submit()` (see StepPersonalInfo /
// StepShipping / StepPayment). The sidebar CTA proxies through this
// ref so the primary action lives next to the order total without
// losing the per-step Zod validation that used to gate the in-card
// button.
const stepRef = ref<{ submit: () => void | Promise<void> } | null>(null)

const sidebarCtaLabel = computed(() =>
  currentStep.value === 2 ? t('place_order') : t('continue'),
)
const sidebarCtaIcon = computed(() =>
  currentStep.value === 2 ? undefined : 'i-heroicons-arrow-right',
)
const sidebarCtaDisabled = computed(() =>
  currentStep.value === 2 && !formState.payWay,
)
// Hide the sidebar CTA while the online-payment view owns the main
// column — that view ships its own Pay / Back controls.
const showSidebarCta = computed(() => !(createdOrder.value && isOnlinePayment.value))

const onSidebarCta = async () => {
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

definePageMeta({
  layout: 'checkout',
  middleware: [
    function (to) {
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
        // A shopper returning from a cancelled/failed hosted-checkout
        // redirect (?canceled / ?error) has a legitimately empty cart —
        // the order was already created and the cart consumed
        // server-side. Bouncing them home with "cart empty" hid WHY the
        // payment didn't complete (the onMounted toast never ran because
        // this middleware bounced first). Surface the real reason.
        if (to.query.canceled) {
          toast.add({
            title: t('payment_canceled'),
            description: t('payment_canceled_description'),
            color: 'warning',
          })
        }
        else if (to.query.error) {
          toast.add({
            title: t('payment_error_title'),
            description: t('payment_error_description'),
            color: 'error',
          })
        }
        else {
          toast.add({
            title: t('cart_empty'),
            color: 'error',
          })
        }
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

        <!-- Stepper. Header clicks go through ``onStepperUpdate`` so
             the per-step Zod schema gates forward jumps the same way
             the sidebar "Συνέχεια" / "Ολοκλήρωση Παραγγελίας" CTA
             does, while backward jumps are free. ``:linear="false"``
             is required: Reka's linear mode silently swallows clicks
             on future steps in ``mousedown.left`` before our handler
             runs, so we keep all the gating server-side. -->
        <UStepper
          :model-value="currentStep"
          :linear="false"
          :items="[
            { title: t('steps.info_and_address'), icon: 'i-heroicons-user-circle' },
            { title: t('shipping.method.title'), icon: 'i-heroicons-truck' },
            { title: t('steps.payment'), icon: 'i-heroicons-credit-card' },
          ]"
          class="mb-6"
          @update:model-value="onStepperUpdate"
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
            ref="stepRef"
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
            ref="stepRef"
            v-model:form-state="formState"
            :schema="step2Schema"
            :partner-id="boxnowPartnerId"
            :api-options="shippingOptions"
            :selected-pay-way="selectedPayWay"
            @next="nextStep"
            @back="prevStep"
          />

          <!-- Step 2: Payment -->
          <CheckoutStepPayment
            v-else-if="currentStep === 2"
            ref="stepRef"
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

            <template #button>
              <UButton
                v-if="showSidebarCta"
                size="lg"
                color="success"
                block
                trailing
                :icon="sidebarCtaIcon"
                :loading="isSubmitting"
                :disabled="sidebarCtaDisabled"
                data-testid="checkout-sidebar-cta"
                :ui="{ trailingIcon: 'ms-0' }"
                @click="onSidebarCta"
              >
                {{ sidebarCtaLabel }}
              </UButton>
            </template>
          </CheckoutSidebar>
        </div>
      </div>
    </div>
  </PageWrapper>
</template>
