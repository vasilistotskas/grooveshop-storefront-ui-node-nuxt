<script lang="ts" setup>
const { loggedIn } = useUserSession()
const localePath = useLocalePath()
const { t } = useI18n()

const cartStore = useCartStore()
const { hasStockIssues, cart } = storeToRefs(cartStore)

if (hasStockIssues.value) {
  await navigateTo(localePath('cart'))
}

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

<i18n lang="yaml">
el:
  continue: Συνέχεια
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
