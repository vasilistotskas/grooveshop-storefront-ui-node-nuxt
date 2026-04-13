<script lang="ts" setup>
const { loggedIn } = useUserSession()
const localePath = useLocalePath()
const { t } = useI18n()

const cartStore = useCartStore()
const { hasStockIssues, cart } = storeToRefs(cartStore)

watchEffect(() => {
  if (hasStockIssues.value) {
    navigateTo(localePath('cart'))
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
  onCountryChange,
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
} = useCheckoutSubmit({ formState, selectedPayWay, payWays })

const handleStockRetry = () => {
  stockError.value = null
  onSubmit()
}

useSeoMeta({
  title: () => t('checkout.title'),
})

definePageMeta({
  layout: 'default',
  middleware: [
    async function () {
      const { $i18n } = useNuxtApp()
      const t = $i18n.t.bind($i18n)
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
          title: t('error.default'),
          description: t('error_occurred'),
          color: 'error',
        })
        return navigateTo(localePath('index'))
      }

      if (!cart?.items || cart?.items.length === 0) {
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

        <!-- Stepper -->
        <UStepper
          v-model="currentStep"
          :items="[
            { title: t('steps.info_and_address'), icon: 'i-heroicons-user-circle' },
            { title: t('steps.payment'), icon: 'i-heroicons-credit-card' },
          ]"
          class="mb-6"
        />

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

        <!-- Step 1: Personal Info & Address -->
        <CheckoutStepPersonalInfo
          v-else-if="currentStep === 0"
          v-model:form-state="formState"
          :schema="step1Schema"
          :country-options="countryOptions"
          :region-options="regionOptions"
          @next="nextStep"
          @country-change="onCountryChange"
        />

        <!-- Step 2: Payment -->
        <CheckoutStepPayment
          v-else-if="currentStep === 1"
          v-model:form-state="formState"
          :schema="step2Schema"
          :pay-way-options="payWayOptions"
          :is-submitting="isSubmitting"
          @submit="onSubmit"
          @back="prevStep"
        />
      </div>

      <!-- Sidebar -->
      <div class="w-full lg:w-[400px]">
        <div class="lg:sticky lg:top-4">
          <CheckoutSidebar
            :shipping-price="shippingPrice"
            :show-payment-fee="currentStep === 1"
            :loyalty-discount="loyaltyDiscount?.amount ?? 0"
          >
            <template #items>
              <CheckoutItems />
            </template>

            <template #loyalty>
              <!-- Loyalty Points Redemption (logged in) -->
              <LoyaltyRedemption
                v-if="loggedIn"
                :currency="'EUR'"
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
