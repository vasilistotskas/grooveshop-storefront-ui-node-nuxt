<script setup lang="ts">
import type { Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js'

interface Props {
  order: OrderDetail
  payWay: PayWay
  disabled?: boolean
}

interface PaymentSuccessData {
  payment_id: string
  status: string
  amount: number
  currency: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  success: [paymentData: PaymentSuccessData]
  error: [error: string]
  ready: []
}>()

const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()

const stripe = ref<Stripe | null>(null)
const elements = ref<StripeElements | null>(null)
const cardElement = ref<StripeCardElement | null>(null)
const cardElementRef = ref<HTMLElement>()

const clientSecret = ref<string | null>(null)
const processing = ref(false)
const error = ref('')
const isCardComplete = ref(false)
const isStripeReady = ref(false)
const currentStep = ref<'card' | 'create' | 'confirm' | 'success'>('card')

const initializeStripe = async () => {
  if (!cardElementRef.value || stripe.value) return

  try {
    const { onLoaded } = useScriptStripe()

    await new Promise<void>((resolve) => {
      onLoaded(async ({ Stripe }) => {
        try {
          stripe.value = Stripe(runtimeConfig.public.stripePublishableKey)

          if (!stripe.value) {
            throw new Error('Failed to initialize Stripe')
          }

          elements.value = stripe.value.elements({
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#0570de',
                colorBackground: '#ffffff',
                colorText: '#30313d',
                colorDanger: '#df1b41',
                fontFamily: 'Inter, system-ui, sans-serif',
                spacingUnit: '4px',
                borderRadius: '8px',
              },
            },
          })

          cardElement.value = elements.value.create('card', {
            style: {
              base: {
                'fontSize': '16px',
                'color': '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
            },
          })

          cardElement.value.mount(cardElementRef.value!)

          cardElement.value.on('change', (event) => {
            isCardComplete.value = event.complete
            error.value = event.error ? event.error.message : ''
          })

          isStripeReady.value = true
          emit('ready')
          resolve()
        }
        catch (err) {
          console.error('Stripe initialization error:', err)
          error.value = t('stripe_init_error')
          resolve()
        }
      })
    })
  }
  catch (err) {
    console.error('Stripe setup error:', err)
    error.value = t('stripe_init_error')
  }
}

watch(cardElementRef, (newRef) => {
  if (newRef && !stripe.value) {
    nextTick(() => {
      initializeStripe()
    })
  }
})

onMounted(() => {
  if (cardElementRef.value && !stripe.value) {
    initializeStripe()
  }
})

const createPaymentIntent = async () => {
  if (processing.value || clientSecret.value) return

  processing.value = true
  error.value = ''
  currentStep.value = 'create'

  try {
    const response = await $fetch(`/api/orders/${props.order.id}/create-payment-intent`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body: {},
    })

    if (!response) {
      throw new Error('No response received from server')
    }

    clientSecret.value = response.clientSecret || null

    if (!clientSecret.value) {
      throw new Error('No client secret received from server')
    }

    currentStep.value = 'confirm'
  }
  catch (err: any) {
    console.error('Payment intent creation error:', err)
    error.value = err.data?.detail || t('payment_intent_error')
    emit('error', error.value)
    currentStep.value = 'card'
  }
  finally {
    processing.value = false
  }
}

const confirmPayment = async () => {
  if (!stripe.value || !cardElement.value || !clientSecret.value || processing.value) {
    return
  }

  processing.value = true
  error.value = ''

  try {
    const { error: stripeError, paymentIntent } = await stripe.value.confirmCardPayment(
      clientSecret.value,
      {
        payment_method: {
          card: cardElement.value,
          billing_details: {
            name: `${props.order.firstName} ${props.order.lastName}`,
            email: props.order.email,
            phone: props.order.phone,
          },
        },
      },
    )

    if (stripeError) {
      error.value = stripeError.message || t('payment_confirmation_error')
      emit('error', error.value)
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      currentStep.value = 'success'
      emit('success', {
        payment_id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      })
    }
  }
  catch (err: any) {
    console.error('Payment confirmation error:', err)
    error.value = err.message || t('payment_confirmation_error')
    emit('error', error.value)
  }
  finally {
    processing.value = false
  }
}

onBeforeUnmount(() => {
  if (cardElement.value) {
    cardElement.value.destroy()
  }
})

defineExpose({
  createPaymentIntent,
  confirmPayment,
  isReady: readonly(isStripeReady),
  isProcessing: readonly(processing),
})
</script>

<template>
  <div id="stripe-payment" class="space-y-4">
    <UStepper
      v-model="currentStep"
      :items="[
        { value: 'card', title: t('step_enter_card'), icon: 'i-heroicons-credit-card' },
        { value: 'create', title: t('step_create_intent'), icon: 'i-heroicons-arrow-path' },
        { value: 'confirm', title: t('step_confirm'), icon: 'i-heroicons-shield-check' },
        { value: 'success', title: t('step_complete'), icon: 'i-heroicons-check-circle' },
      ]"
      disabled
      size="sm"
      color="success"
    />

    <div class="relative">
      <div
        ref="cardElementRef" class="min-h-12 rounded-lg p-4 transition-all" :class="{ 'ring-1 ring-green-300': isCardComplete }"
      />

      <div
        v-if="!isStripeReady" class="
          absolute inset-0 flex items-center justify-center rounded-lg
          bg-primary-100 backdrop-blur-sm
          dark:bg-primary-900
        "
      >
        <div class="space-y-2 text-center">
          <UIcon
            name="i-heroicons-arrow-path" class="
              mx-auto h-8 w-8 animate-spin text-primary
            "
          />
          <p
            class="
              text-sm text-primary-950
              dark:text-primary-50
            "
          >
            {{ t('loading_payment') }}
          </p>
        </div>
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-heroicons-exclamation-circle"
      :title="t('payment_error')"
      :description="error"
      :close="{ color: 'error', variant: 'link' }"
      @update:open="error = ''"
    />

    <UAlert
      v-if="currentStep === 'confirm' && !processing && !error"
      color="success"
      variant="soft"
      icon="i-heroicons-check-circle"
      :title="t('payment_intent_ready')"
      :description="t('ready_to_confirm')"
    />

    <UProgress
      v-if="processing"
      animation="carousel"
      color="success"
      size="sm"
    />

    <div class="space-y-2">
      <UButton
        v-if="!clientSecret"
        :loading="processing"
        :disabled="!isCardComplete || !isStripeReady"
        block
        size="lg"
        variant="soft"
        icon="i-heroicons-shield-check"
        @click="createPaymentIntent"
      >
        {{ t('create_payment') }}
      </UButton>

      <UButton
        v-else-if="currentStep === 'confirm'"
        :loading="processing"
        :disabled="!isCardComplete"
        color="neutral"
        block
        size="lg"
        icon="i-heroicons-lock-closed"
        @click="confirmPayment"
      >
        {{ t('confirm_payment') }}
      </UButton>

      <div class="flex items-center justify-center gap-2">
        <UBadge
          v-if="isCardComplete"
          color="success"
          variant="subtle"
          size="sm"
        >
          <UIcon name="i-heroicons-check" class="mr-1 h-3 w-3" />
          {{ t('card_valid') }}
        </UBadge>
        <UBadge
          v-if="isStripeReady"
          color="neutral"
          variant="subtle"
          size="sm"
        >
          <UIcon name="i-heroicons-shield-check" class="mr-1 h-3 w-3" />
          {{ t('secure_connection') }}
        </UBadge>
      </div>
    </div>

    <div
      class="
        flex items-start gap-2 rounded-lg bg-primary-100 p-3 text-xs
        text-primary-950
        dark:bg-primary-900 dark:text-primary-50
      "
    >
      <UIcon name="i-heroicons-lock-closed" class="mt-0.5 h-4 w-4 shrink-0" />
      <p>{{ t('security_notice') }}</p>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  loading_payment: Φόρτωση πληρωμής...
  stripe_init_error: Αποτυχία αρχικοποίησης συστήματος πληρωμής
  payment_intent_error: Αποτυχία δημιουργίας πρόθεσης πληρωμής
  payment_confirmation_error: Η επιβεβαίωση πληρωμής απέτυχε
  payment_error: Σφάλμα Πληρωμής
  create_payment: Δημιουργία Πληρωμής
  confirm_payment: Επιβεβαίωση Πληρωμής
  payment_intent_ready: Έτοιμο για Πληρωμή
  ready_to_confirm: Η πληρωμή είναι έτοιμη. Πάτα το κουμπί παρακάτω για επιβεβαίωση.
  step_enter_card: Εισαγωγή Κάρτας
  step_create_intent: Δημιουργία
  step_confirm: Επιβεβαίωση
  step_complete: Ολοκλήρωση
  card_valid: Έγκυρη Κάρτα
  secure_connection: Ασφαλής Σύνδεση
  security_notice: Οι πληρωμές σου είναι ασφαλείς και κρυπτογραφημένες με SSL. Δεν αποθηκεύουμε τα στοιχεία της κάρτας σου.
</i18n>
