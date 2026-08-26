<script lang="ts" setup>
import type { Stripe, StripeCardElement, StripeElements } from '@stripe/stripe-js'
import * as z from 'zod'

const { t } = useI18n()
const { $i18n } = useNuxtApp()
const toast = useToast()
const tenantStore = useTenantStore()
const { user } = useUserSession()

defineRouteRules({
  robots: false,
})

definePageMeta({
  middleware: ['gift-cards-enabled'],
})

useSeoMeta({
  title: () => t('title'),
  description: () => t('description'),
})

// Purchase bounds are merchant-tunable (extra_settings).
const { data: minSetting } = useFetch<{ value?: string }>(
  '/api/settings/get',
  {
    key: 'gift-cards:min-amount',
    query: { key: 'GIFT_CARD_MIN_AMOUNT' },
    default: () => ({ value: '10' }),
  },
)
const { data: maxSetting } = useFetch<{ value?: string }>(
  '/api/settings/get',
  {
    key: 'gift-cards:max-amount',
    query: { key: 'GIFT_CARD_MAX_AMOUNT' },
    default: () => ({ value: '500' }),
  },
)
const minAmount = computed(() => Number(minSetting.value?.value ?? 10))
const maxAmount = computed(() => Number(maxSetting.value?.value ?? 500))

// Online providers the merchant has configured — Viva Wallet is the
// primary provider, Stripe secondary. Derived from the pay-way list
// so a merchant who disables a provider hides it here too.
const { data: payWays } = useLazyAsyncData(
  'gift-cards:pay-ways',
  () => $fetch<Pagination<PayWay>>('/api/pay-way', {
    method: 'GET',
    headers: useRequestHeaders(),
  }).catch(() => null),
  { default: () => null },
)
const availableProviders = computed(() => {
  const codes = new Set(
    (payWays.value?.results ?? [])
      .filter(payWay => payWay.isOnlinePayment && payWay.active)
      .map(payWay => payWay.providerCode ?? ''),
  )
  if (!tenantStore.stripePublishableKey) {
    codes.delete('stripe')
  }
  return (['viva_wallet', 'stripe'] as const).filter(code =>
    codes.has(code))
})
const selectedProvider = ref<'viva_wallet' | 'stripe' | undefined>(undefined)
watch(availableProviders, (providers) => {
  if (!selectedProvider.value || !providers.includes(selectedProvider.value)) {
    selectedProvider.value = providers[0]
  }
}, { immediate: true })
const providerOptions = computed(() =>
  availableProviders.value.map(code => ({
    label: t(`providers.${code}`),
    description: t(`providers.${code}_hint`),
    value: code,
  })))

// Desktop value-prop aside. Every claim here is a real property of
// the feature: email delivery (with optional scheduling), ledger-based
// partial redemption across orders, and merchant-tunable bounds.
const benefits = computed(() => [
  {
    icon: 'i-heroicons-envelope',
    title: t('benefits.delivery.title'),
    description: t('benefits.delivery.description'),
  },
  {
    icon: 'i-heroicons-banknotes',
    title: t('benefits.balance.title'),
    description: t('benefits.balance.description'),
  },
  {
    icon: 'i-heroicons-adjustments-horizontal',
    title: t('benefits.amount.title'),
    description: t('benefits.amount.description', {
      min: $i18n.n(minAmount.value, 'currency'),
      max: $i18n.n(maxAmount.value, 'currency'),
    }),
  },
])

const SUGGESTED_AMOUNTS = [25, 50, 100]
const suggestedAmounts = computed(() =>
  SUGGESTED_AMOUNTS.filter(
    amount => amount >= minAmount.value && amount <= maxAmount.value,
  ))

const purchaseSchema = computed(() => z.object({
  amount: z
    .number({ error: t('validation.amount_required') })
    .min(minAmount.value, {
      error: t('validation.amount_min', { min: minAmount.value }),
    })
    .max(maxAmount.value, {
      error: t('validation.amount_max', { max: maxAmount.value }),
    }),
  buyerEmail: z
    .string({ error: t('validation.required') })
    .email({ error: t('validation.email') }),
  recipientEmail: z
    .string({ error: t('validation.required') })
    .email({ error: t('validation.email') }),
  recipientName: z.string().max(255).optional(),
  senderName: z.string().max(255).optional(),
  message: z.string().max(2000, { error: t('validation.message_max') }).optional(),
}))

const formState = reactive({
  amount: 50 as number | undefined,
  buyerEmail: user.value?.email ?? '',
  recipientEmail: '',
  recipientName: '',
  senderName: '',
  message: '',
})

const step = ref<'form' | 'payment' | 'success'>('form')
const submitting = ref(false)
const purchaseError = ref<string | null>(null)
const clientSecret = ref<string | null>(null)
const purchasedAmount = ref(0)
const recipientEmailDisplay = ref('')

const startPurchase = async () => {
  if (!selectedProvider.value) {
    purchaseError.value = t('errors.no_provider')
    return
  }
  purchaseError.value = null
  submitting.value = true
  try {
    const response = await $fetch<{
      purchaseUuid: string
      provider: string
      clientSecret?: string
      paymentIntentId?: string
      checkoutUrl?: string
      amount: string | number
      currency: string
    }>('/api/giftcard/purchase', {
      method: 'POST',
      body: {
        amount: formState.amount,
        buyerEmail: formState.buyerEmail,
        recipientEmail: formState.recipientEmail,
        recipientName: formState.recipientName || undefined,
        senderName: formState.senderName || undefined,
        message: formState.message || undefined,
        paymentProvider: selectedProvider.value,
      },
    })

    // Viva Smart Checkout is a hosted redirect — the buyer pays on
    // Viva's page and returns via /checkout/viva-return, which lands
    // on /gift-cards/success for status polling.
    if (response.checkoutUrl) {
      window.location.assign(response.checkoutUrl)
      return
    }

    clientSecret.value = response.clientSecret ?? null
    purchasedAmount.value = Number(response.amount)
    recipientEmailDisplay.value = formState.recipientEmail
    step.value = 'payment'
  }
  catch (error: any) {
    purchaseError.value
      = error?.data?.detail || t('errors.purchase_failed')
  }
  finally {
    submitting.value = false
  }
}

// ── Stripe card confirmation (lean clone of StripePayment.vue) ──────
const stripe = ref<Stripe | null>(null)
const elements = ref<StripeElements | null>(null)
const cardElement = ref<StripeCardElement | null>(null)
const cardElementRef = ref<HTMLElement>()
const isCardComplete = ref(false)
const cardError = ref('')
const paying = ref(false)

const initializeStripe = async () => {
  if (!cardElementRef.value || stripe.value) return
  try {
    const { onLoaded } = useScriptStripe()
    onLoaded(({ Stripe }) => {
      try {
        stripe.value = Stripe(tenantStore.stripePublishableKey)
        elements.value = stripe.value!.elements()
        cardElement.value = elements.value.create('card', {
          style: { base: { fontSize: '16px' } },
        })
        cardElement.value.mount(cardElementRef.value!)
        cardElement.value.on('change', (event) => {
          isCardComplete.value = event.complete
          cardError.value = event.error ? event.error.message : ''
        })
      }
      catch (err) {
        log.error({ action: 'giftcard:stripeInit', error: err })
        cardError.value = t('errors.stripe_init')
      }
    })
  }
  catch (err) {
    log.error({ action: 'giftcard:stripeSetup', error: err })
    cardError.value = t('errors.stripe_init')
  }
}

watch(cardElementRef, (newRef) => {
  if (newRef && !stripe.value) {
    nextTick(() => initializeStripe())
  }
})

const confirmPayment = async () => {
  if (!stripe.value || !cardElement.value || !clientSecret.value) return
  paying.value = true
  cardError.value = ''
  try {
    const result = await stripe.value.confirmCardPayment(clientSecret.value, {
      payment_method: {
        card: cardElement.value,
        billing_details: {
          name: formState.senderName || undefined,
          email: formState.buyerEmail,
        },
      },
    })
    if (result.error) {
      cardError.value = result.error.message || t('errors.payment_failed')
      return
    }
    step.value = 'success'
    toast.add({
      title: t('success.title'),
      color: 'success',
      icon: 'i-heroicons-gift',
    })
  }
  catch (error) {
    log.error({ action: 'giftcard:confirmPayment', error })
    cardError.value = t('errors.payment_failed')
  }
  finally {
    paying.value = false
  }
}
</script>

<template>
  <PageWrapper class="flex flex-col gap-6">
    <PageTitle :text="t('title')" />

    <!--
      Desktop gets a two-column composition: the value-prop aside on
      the left, the form on the right. Below ``lg`` it collapses to a
      single centred column with the FORM FIRST (order-1) so mobile
      shoppers are not made to scroll past marketing copy to buy —
      the aside becomes supporting content underneath.
    -->
    <div
      class="
        mx-auto grid w-full max-w-xl gap-8
        lg:max-w-(--container-6xl) lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]
        lg:items-start
      "
    >
      <aside
        v-if="step === 'form'"
        class="
          order-2 space-y-6
          lg:order-1 lg:sticky lg:top-24
        "
      >
        <div
          class="
            relative overflow-hidden rounded-2xl border border-primary-200 p-6
            dark:border-primary-800
          "
        >
          <div
            class="
              absolute inset-0 bg-linear-to-br from-(--ui-secondary)/15
              via-transparent to-success/15
            "
            aria-hidden="true"
          />
          <div class="relative flex items-start gap-4">
            <div
              class="
                flex size-14 shrink-0 items-center justify-center rounded-xl
                bg-(--ui-secondary)/15
              "
            >
              <UIcon
                name="i-heroicons-gift"
                class="size-8 text-(--ui-secondary)"
              />
            </div>
            <div class="min-w-0 space-y-1">
              <h2
                class="
                  text-xl font-bold text-primary-950
                  dark:text-primary-50
                "
              >
                {{ t('hero.title') }}
              </h2>
              <p class="text-sm text-muted">
                {{ t('hero.subtitle') }}
              </p>
            </div>
          </div>
        </div>

        <ul class="grid gap-3">
          <li
            v-for="benefit in benefits"
            :key="benefit.title"
            class="
              flex items-start gap-3 rounded-xl border border-primary-200 p-4
              dark:border-primary-800
            "
          >
            <UIcon
              :name="benefit.icon"
              class="mt-0.5 size-5 shrink-0 text-success"
            />
            <div class="min-w-0">
              <p
                class="
                  text-sm font-semibold text-primary-950
                  dark:text-primary-50
                "
              >
                {{ benefit.title }}
              </p>
              <p class="text-sm text-muted">
                {{ benefit.description }}
              </p>
            </div>
          </li>
        </ul>
      </aside>

      <!-- Step 1: details -->
      <UCard
        v-if="step === 'form'"
        class="
          order-1
          lg:order-2
        "
      >
        <template #header>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold">
              {{ t('form_title') }}
            </h2>
            <p class="text-sm text-muted">
              {{ t('description') }}
            </p>
          </div>
        </template>

        <UForm
          :state="formState"
          :schema="purchaseSchema"
          class="space-y-4"
          @submit="startPurchase"
        >
          <UFormField :label="t('fields.amount')" name="amount" required>
            <div class="space-y-2">
              <div
                class="
                  grid grid-cols-3 gap-2
                "
              >
                <UButton
                  v-for="amount in suggestedAmounts"
                  :key="amount"
                  :variant="formState.amount === amount ? 'solid' : 'outline'"
                  color="secondary"
                  size="lg"
                  block
                  :aria-pressed="formState.amount === amount"
                  @click="formState.amount = amount"
                >
                  {{ $i18n.n(amount, 'currency') }}
                </UButton>
              </div>
              <UInputNumber
                v-model="formState.amount"
                :min="minAmount"
                :max="maxAmount"
                :step="5"
                :aria-label="t('fields.amount')"
              />
              <p class="text-xs text-muted">
                {{ t('fields.amount_hint', { min: $i18n.n(minAmount, 'currency'), max: $i18n.n(maxAmount, 'currency') }) }}
              </p>
            </div>
          </UFormField>

          <UFormField :label="t('fields.buyer_email')" name="buyerEmail" required>
            <UInput
              v-model="formState.buyerEmail"
              type="email"
              autocomplete="email"
            />
          </UFormField>

          <UFormField :label="t('fields.recipient_email')" name="recipientEmail" required>
            <UInput
              v-model="formState.recipientEmail"
              type="email"
            />
          </UFormField>

          <UFormField :label="t('fields.recipient_name')" name="recipientName">
            <UInput v-model="formState.recipientName" />
          </UFormField>

          <UFormField :label="t('fields.sender_name')" name="senderName">
            <UInput v-model="formState.senderName" />
          </UFormField>

          <UFormField :label="t('fields.message')" name="message">
            <UTextarea
              v-model="formState.message"
              :rows="3"
              :placeholder="t('fields.message_placeholder')"
            />
          </UFormField>

          <UFormField
            v-if="providerOptions.length > 1"
            :label="t('fields.payment_method')"
            name="paymentProvider"
          >
            <URadioGroup
              v-model="selectedProvider"
              :items="providerOptions"
              variant="card"
              indicator="end"
              color="secondary"
            />
          </UFormField>

          <p
            v-if="purchaseError"
            class="
              text-sm text-error-600
              dark:text-error-400
            "
          >
            {{ purchaseError }}
          </p>

          <UButton
            type="submit"
            size="lg"
            color="success"
            block
            :loading="submitting"
          >
            {{ t('continue_to_payment') }}
          </UButton>
        </UForm>
      </UCard>

      <!-- Step 2: card payment -->
      <UCard v-else-if="step === 'payment'">
        <template #header>
          <h2 class="text-lg font-semibold">
            {{ t('payment_title', { amount: $i18n.n(purchasedAmount, 'currency') }) }}
          </h2>
        </template>

        <div class="space-y-4">
          <div
            ref="cardElementRef"
            class="
              rounded-lg border border-primary-200 p-4
              dark:border-primary-800
            "
          />

          <p
            v-if="cardError"
            class="
              text-sm text-error-600
              dark:text-error-400
            "
          >
            {{ cardError }}
          </p>

          <UButton
            size="lg"
            color="success"
            block
            :loading="paying"
            :disabled="!isCardComplete"
            @click="confirmPayment"
          >
            {{ t('pay_now', { amount: $i18n.n(purchasedAmount, 'currency') }) }}
          </UButton>
        </div>
      </UCard>

      <!-- Step 3: success -->
      <UCard v-else>
        <div class="space-y-4 py-6 text-center">
          <UIcon
            name="i-heroicons-check-circle"
            class="mx-auto size-12 text-success"
          />
          <h2 class="text-xl font-semibold">
            {{ t('success.title') }}
          </h2>
          <p class="text-muted">
            {{ t('success.description', { email: recipientEmailDisplay }) }}
          </p>
        </div>
      </UCard>
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Δωροκάρτες
  description: Χαρίστε μια δωροκάρτα — παραδίδεται με email και εξαργυρώνεται στο ταμείο
  form_title: Στοιχεία δωροκάρτας
  continue_to_payment: Συνέχεια στην πληρωμή
  payment_title: Πληρωμή {amount}
  pay_now: Πληρωμή {amount}
  fields:
    amount: Ποσό
    amount_hint: Από {min} έως {max}
    buyer_email: Το email σας
    recipient_email: Email παραλήπτη
    recipient_name: Όνομα παραλήπτη
    sender_name: Το όνομά σας
    message: Μήνυμα
    message_placeholder: Προσωπικό μήνυμα για τον παραλήπτη (προαιρετικό)
    payment_method: Τρόπος πληρωμής
  providers:
    viva_wallet: Viva Wallet
    viva_wallet_hint: Κάρτα, Google Pay ή IRIS μέσω Viva
    stripe: Κάρτα (Stripe)
    stripe_hint: Πληρωμή με κάρτα στη σελίδα μας
  hero:
    title: Δώρο που ταιριάζει πάντα
    subtitle: Ο παραλήπτης διαλέγει ό,τι θέλει από το κατάστημα — εσύ διαλέγεις μόνο το ποσό.
  benefits:
    delivery:
      title: Παράδοση με email
      description: Η δωροκάρτα φτάνει στον παραλήπτη με email μόλις ολοκληρωθεί η πληρωμή.
    balance:
      title: Χρήση σε πολλές παραγγελίες
      description: Το υπόλοιπο μένει στην κάρτα — μπορεί να χρησιμοποιηθεί ξανά μέχρι να εξαντληθεί.
    amount:
      title: Εσύ επιλέγεις το ποσό
      description: Από {min} έως {max}, με προτεινόμενες τιμές ή δικό σου ποσό.
  success:
    title: Η αγορά ολοκληρώθηκε!
    description: Η δωροκάρτα θα σταλεί στο {email} μόλις επιβεβαιωθεί η πληρωμή
  errors:
    purchase_failed: Η αγορά δεν μπόρεσε να ξεκινήσει
    payment_failed: Η πληρωμή απέτυχε — δοκιμάστε ξανά
    stripe_init: Αδυναμία φόρτωσης του συστήματος πληρωμών
    no_provider: Δεν υπάρχει διαθέσιμος τρόπος online πληρωμής
  validation:
    required: Υποχρεωτικό πεδίο
    email: Μη έγκυρο email
    amount_required: Συμπληρώστε ποσό
    amount_min: Ελάχιστο ποσό {min} €
    amount_max: Μέγιστο ποσό {max} €
    message_max: Το μήνυμα είναι πολύ μεγάλο
</i18n>
