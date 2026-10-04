<script lang="ts" setup>
import type { Stripe, StripeCardElement, StripeElements } from '@stripe/stripe-js'
import * as z from 'zod'

const { t, locale } = useI18n()
const { $i18n } = useNuxtApp()
const toast = useToast()
const tenantStore = useTenantStore()
const { user } = useUserSession()

useSeoMeta({
  title: () => t('title'),
  description: () => t('description'),
})

const breadcrumb = computed(() => [{ label: t('title') }])

// Purchase bounds are merchant-tunable (extra_settings); an unset
// bound keeps the platform default.
const minSetting = useSettingValue('GIFT_CARD_MIN_AMOUNT')
const maxSetting = useSettingValue('GIFT_CARD_MAX_AMOUNT')
const minAmount = computed(() => Number(minSetting.value || 10))
const maxAmount = computed(() => Number(maxSetting.value || 500))

// Online providers the merchant has configured — Viva Wallet is the
// primary provider, Stripe secondary. Derived from the pay-way list
// so a merchant who disables a provider hides it here too.
const { data: payWays } = useLazyAsyncData(
  'gift-cards:pay-ways',
  () => $api<Pagination<PayWay>>('/api/pay-way', {
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

// Value props beside the card. Every claim is a real property of the
// feature: email delivery (instantly or on a chosen date — the
// purchase's `deliverAt`) and ledger-based partial redemption across
// orders. No validity claim: the card's expiry is the store's to set.
const benefits = computed(() => [
  {
    icon: 'i-lucide-gift',
    title: t('benefits.delivery.title'),
    description: t('benefits.delivery.description'),
  },
  {
    icon: 'i-lucide-refresh-cw',
    title: t('benefits.balance.title'),
    description: t('benefits.balance.description'),
  },
])

// ── The wizard: Amount → Recipient → Payment ────────────────────────
type WizardStep = 'amount' | 'recipient' | 'payment'
const wizard = ref<WizardStep>('amount')
const steps = computed(() => [
  { title: t('steps.amount'), value: 'amount' },
  { title: t('steps.recipient'), value: 'recipient' },
  { title: t('steps.payment'), value: 'payment' },
])

// The fields each step asks for, so Continue validates only those.
const STEP_FIELDS: Record<WizardStep, string[]> = {
  amount: ['amount'],
  recipient: ['buyerEmail', 'recipientEmail', 'recipientName', 'senderName', 'message', 'deliverDate'],
  payment: [],
}

const SUGGESTED_AMOUNTS = [25, 50, 100]
const suggestedAmounts = computed(() =>
  SUGGESTED_AMOUNTS.filter(
    amount => amount >= minAmount.value && amount <= maxAmount.value,
  ))

// One radio card per suggested amount, then "Other" for a typed one.
const OTHER = 'other'
const amountChoice = ref<string>(suggestedAmounts.value.includes(50) ? '50' : OTHER)
const amountItems = computed(() => [
  ...suggestedAmounts.value.map(amount => ({
    // Whole denominations, as the card itself prints them ("50 €").
    label: $i18n.n(amount, { key: 'currency', minimumFractionDigits: 0 }),
    value: String(amount),
  })),
  { label: t('fields.amount_other'), value: OTHER },
])

// "Send on a date" is the purchase's `deliverAt`; "Now" leaves it out
// and Django delivers right after payment.
const sendMode = ref<'now' | 'date'>('now')
const sendItems = computed(() => [
  { label: t('fields.send_now'), value: 'now', icon: 'i-lucide-send' },
  { label: t('fields.send_date'), value: 'date', icon: 'i-lucide-calendar' },
])
const pad = (value: number) => String(value).padStart(2, '0')
// A scheduled card goes out from tomorrow; "Now" covers today.
const minDeliverDate = computed(() => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`
})

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
  deliverDate: z.string().optional(),
}).refine(
  state => sendMode.value !== 'date' || (state.deliverDate !== undefined && state.deliverDate >= minDeliverDate.value),
  { error: t('validation.date_required'), path: ['deliverDate'] },
))

const formState = reactive({
  amount: 50 as number | undefined,
  buyerEmail: user.value?.email ?? '',
  recipientEmail: '',
  recipientName: '',
  senderName: '',
  message: '',
  deliverDate: '',
})

// The amount cards write the amount; "Other" leaves the typed one.
watch(amountChoice, (choice) => {
  if (choice !== OTHER) formState.amount = Number(choice)
})

// Midnight of the chosen day, local time: the scheduled sweep delivers
// it on that day without the form promising an hour.
const deliverAt = computed(() =>
  sendMode.value === 'date' && formState.deliverDate
    ? new Date(`${formState.deliverDate}T00:00:00`).toISOString()
    : undefined)

const formRef = useTemplateRef<{
  validate: (opts?: { name?: string | string[] }) => Promise<unknown>
}>('formRef')

const step = ref<'form' | 'payment' | 'success'>('form')
const submitting = ref(false)
const purchaseError = ref<string | null>(null)
const clientSecret = ref<string | null>(null)
const purchasedAmount = ref(0)
const recipientEmailDisplay = ref('')

const STEP_ORDER: WizardStep[] = ['amount', 'recipient', 'payment']

function stepHasIssues(target: WizardStep) {
  const fields = STEP_FIELDS[target]
  const issues = purchaseSchema.value.safeParse(formState).error?.issues ?? []
  return issues.some(issue => fields.includes(String(issue.path[0])))
}

// The first step before `end` that is not fit to leave, so a jump past it
// (the stepper's, or Pay's) lands on it instead.
const firstUnfitStep = (end: number) =>
  STEP_ORDER.slice(0, end).find(stepHasIssues)

// Show a step and let its fields say what is wrong.
async function showStep(target: WizardStep) {
  wizard.value = target
  await nextTick()
  try {
    await formRef.value?.validate({ name: STEP_FIELDS[target] })
  }
  catch {
    // UForm has put the messages on the fields.
  }
}

async function goTo(target: WizardStep) {
  if (STEP_ORDER.indexOf(target) > STEP_ORDER.indexOf(wizard.value)) {
    // Going forward asks for what every step it passes needs, the one on
    // screen first so its own fields show their messages. The payment step
    // is only reachable through here, so what it sends has been checked.
    try {
      await formRef.value?.validate({ name: STEP_FIELDS[wizard.value] })
    }
    catch {
      return
    }
    const unfit = firstUnfitStep(STEP_ORDER.indexOf(target))
    if (unfit) {
      await showStep(unfit)
      return
    }
  }
  wizard.value = target
}

const startPurchase = async () => {
  if (!selectedProvider.value) {
    purchaseError.value = t('errors.no_provider')
    return
  }
  purchaseError.value = null
  submitting.value = true
  try {
    const response = await $api<{
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
        deliverAt: deliverAt.value,
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
      icon: 'i-lucide-gift',
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
  <UContainer class="flex flex-col gap-8 pt-6 pb-14 lg:gap-10 lg:pb-22">
    <div class="flex flex-col gap-6">
      <PageBreadcrumb :items="breadcrumb" />

      <header class="flex flex-col gap-2">
        <h1
          class="
            font-display text-[1.875rem]/[1.1] font-bold tracking-[-0.02em]
            text-highlighted
            lg:text-[2.25rem]/[1.1]
          "
        >
          {{ t('title') }}
        </h1>
        <p class="max-w-2xl text-toned">
          {{ t('description') }}
        </p>
      </header>
    </div>

    <div
      class="
        grid items-start gap-8
        lg:grid-cols-2
      "
    >
      <div
        v-if="step !== 'success'"
        class="flex flex-col gap-6"
      >
        <GiftCardPreview
          :amount="formState.amount"
          :recipient-name="formState.recipientName"
          :sender-name="formState.senderName"
          :message="formState.message"
        />

        <ul
          class="
            grid gap-4
            sm:grid-cols-2
          "
        >
          <li
            v-for="benefit in benefits"
            :key="benefit.title"
            class="flex flex-col gap-1"
          >
            <UIcon
              :name="benefit.icon"
              class="size-5 text-highlighted"
            />
            <p class="font-semibold text-highlighted">
              {{ benefit.title }}
            </p>
            <p class="text-sm text-toned">
              {{ benefit.description }}
            </p>
          </li>
        </ul>
      </div>

      <section
        class="
          flex flex-col gap-6 rounded-[1.25rem] bg-default p-5 ring ring-default
          sm:p-6
        "
        :class="step === 'success' ? 'lg:col-span-2' : ''"
      >
        <!-- Step 3 of 3: the purchase went through -->
        <div
          v-if="step === 'success'"
          class="flex flex-col items-center gap-3 py-6 text-center"
        >
          <UIcon
            name="i-lucide-circle-check"
            class="size-12 text-highlighted"
          />
          <h2 class="font-display text-xl font-bold text-highlighted">
            {{ t('success.title') }}
          </h2>
          <p class="text-toned">
            {{ t('success.description', { email: recipientEmailDisplay }) }}
          </p>
        </div>

        <template v-else>
          <!-- Once the payment is under way the strip is locked: the intent
               already holds the amount and the recipient, and going back
               would unmount the card field Stripe mounted. -->
          <!-- The board's compact strip: each step's number beside its
               title, a short rule between steps, the current one in ink. -->
          <UStepper
            :model-value="wizard"
            :items="steps"
            color="neutral"
            size="xs"
            :linear="false"
            :disabled="step === 'payment'"
            :ui="{
              header: 'flex-wrap items-center gap-x-3 gap-y-2',
              item: `
                flex w-auto flex-row items-center gap-2 text-start
                after:h-px after:w-6 after:bg-accented after:content-['']
                last:after:hidden
              `,
              container: 'flex-none',
              separator: 'hidden',
              wrapper: 'mt-0',
              title: 'text-sm',
            }"
            @update:model-value="(value) => goTo(value as WizardStep)"
          />

          <UForm
            ref="formRef"
            :state="formState"
            :schema="purchaseSchema"
            class="flex flex-col gap-5"
            @error="scrollToFirstFormError"
          >
            <!-- Step 1: amount -->
            <template v-if="wizard === 'amount'">
              <!-- The group is named by its own legend: a field label would
                   point at a div, not a control. -->
              <UFormField name="amount">
                <div class="flex flex-col gap-3">
                  <URadioGroup
                    v-model="amountChoice"
                    :items="amountItems"
                    variant="card"
                    indicator="hidden"
                    orientation="horizontal"
                    :legend="t('fields.amount')"
                    :ui="{
                      legend: 'mb-2 text-sm font-medium text-default',
                      fieldset: 'grid grid-cols-4 gap-2',
                      item: 'justify-center font-mono font-semibold',
                    }"
                  />
                  <UInputNumber
                    v-if="amountChoice === OTHER"
                    v-model="formState.amount"
                    :min="minAmount"
                    :max="maxAmount"
                    :step="5"
                    :aria-label="t('fields.amount_other')"
                  />
                  <p class="text-xs text-toned">
                    {{ t('fields.amount_hint', { min: $i18n.n(minAmount, 'currency'), max: $i18n.n(maxAmount, 'currency') }) }}
                  </p>
                </div>
              </UFormField>
            </template>

            <!-- Step 2: recipient -->
            <template v-else-if="wizard === 'recipient'">
              <div class="grid gap-4 sm:grid-cols-2">
                <UFormField
                  :label="t('fields.recipient_name')"
                  name="recipientName"
                >
                  <UInput v-model="formState.recipientName" class="w-full" />
                </UFormField>
                <UFormField
                  :label="t('fields.recipient_email')"
                  name="recipientEmail"
                  required
                >
                  <UInput
                    v-model="formState.recipientEmail"
                    type="email"
                    class="w-full"
                  />
                </UFormField>
                <UFormField
                  :label="t('fields.sender_name')"
                  name="senderName"
                >
                  <UInput v-model="formState.senderName" class="w-full" />
                </UFormField>
                <UFormField
                  :label="t('fields.buyer_email')"
                  name="buyerEmail"
                  :hint="t('fields.buyer_email_hint')"
                  required
                >
                  <UInput
                    v-model="formState.buyerEmail"
                    type="email"
                    autocomplete="email"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <UFormField
                :label="t('fields.message')"
                name="message"
              >
                <UTextarea
                  v-model="formState.message"
                  :rows="3"
                  :placeholder="t('fields.message_placeholder')"
                  class="w-full"
                />
              </UFormField>

              <UFormField name="deliverDate">
                <div class="flex flex-col gap-3">
                  <URadioGroup
                    v-model="sendMode"
                    :items="sendItems"
                    variant="card"
                    indicator="hidden"
                    orientation="horizontal"
                    :legend="t('fields.send')"
                    :ui="{
                      legend: 'mb-2 text-sm font-medium text-default',
                      fieldset: 'grid grid-cols-2 gap-2',
                      item: 'justify-center',
                    }"
                  />
                  <UInput
                    v-if="sendMode === 'date'"
                    v-model="formState.deliverDate"
                    type="date"
                    :min="minDeliverDate"
                    :aria-label="t('fields.send_date')"
                    class="w-full"
                  />
                </div>
              </UFormField>
            </template>

            <!-- Step 3: payment -->
            <template v-else>
              <dl class="flex flex-col gap-1 text-sm">
                <div class="flex justify-between gap-4">
                  <dt class="text-toned">
                    {{ t('summary.amount') }}
                  </dt>
                  <dd class="font-mono font-semibold text-highlighted">
                    {{ $i18n.n(formState.amount ?? 0, 'currency') }}
                  </dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-toned">
                    {{ t('summary.to') }}
                  </dt>
                  <dd class="text-highlighted">
                    {{ formState.recipientEmail }}
                  </dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-toned">
                    {{ t('summary.delivery') }}
                  </dt>
                  <dd class="text-highlighted">
                    <NuxtTime
                      v-if="deliverAt"
                      :datetime="deliverAt"
                      :locale="locale"
                      date-style="long"
                    />
                    <template v-else>
                      {{ t('summary.right_away') }}
                    </template>
                  </dd>
                </div>
              </dl>

              <!-- Card payment (Stripe) -->
              <div
                v-if="step === 'payment'"
                class="flex flex-col gap-4"
              >
                <h2 class="font-semibold text-highlighted">
                  {{ t('payment_title', { amount: $i18n.n(purchasedAmount, 'currency') }) }}
                </h2>
                <div
                  ref="cardElementRef"
                  class="rounded-lg p-4 ring ring-default"
                />
                <p
                  v-if="cardError"
                  class="text-sm text-error"
                >
                  {{ cardError }}
                </p>
                <UButton
                  size="lg"
                  color="neutral"
                  block
                  :loading="paying"
                  :disabled="!isCardComplete"
                  @click="confirmPayment"
                >
                  {{ t('pay_now', { amount: $i18n.n(purchasedAmount, 'currency') }) }}
                </UButton>
              </div>

              <template v-else>
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
                  />
                </UFormField>

                <p
                  v-if="purchaseError"
                  class="text-sm text-error"
                >
                  {{ purchaseError }}
                </p>
              </template>
            </template>

            <div
              v-if="step !== 'payment'"
              class="flex items-center justify-between gap-3"
            >
              <UButton
                v-if="wizard !== 'amount'"
                color="neutral"
                variant="ghost"
                size="lg"
                :label="t('back')"
                @click="() => goTo(wizard === 'payment' ? 'recipient' : 'amount')"
              />
              <span v-else />
              <UButton
                v-if="wizard !== 'payment'"
                color="neutral"
                size="lg"
                :label="wizard === 'amount' ? t('continue') : t('continue_to_payment', { amount: $i18n.n(formState.amount ?? 0, 'currency') })"
                @click="() => goTo(wizard === 'amount' ? 'recipient' : 'payment')"
              />
              <UButton
                v-else
                color="neutral"
                size="lg"
                :loading="submitting"
                :label="t('pay_now', { amount: $i18n.n(formState.amount ?? 0, 'currency') })"
                @click="startPurchase"
              />
            </div>
          </UForm>
        </template>
      </section>
    </div>

    <GiftCardBalanceCheck />
  </UContainer>
</template>

<i18n lang="yaml">
el:
  title: Δωροκάρτες
  description: Το πιο εύκολο δώρο για οποιονδήποτε έχει κινητό. Εξαργυρώνεται online σε ό,τι πουλάει το κατάστημα.
  continue: Συνέχεια
  continue_to_payment: Συνέχεια στην πληρωμή · {amount}
  back: Πίσω
  payment_title: Πληρωμή {amount}
  pay_now: Πληρωμή {amount}
  steps:
    amount: Ποσό
    recipient: Παραλήπτης
    payment: Πληρωμή
  fields:
    amount: Ποσό
    amount_other: Άλλο
    amount_hint: Οποιοδήποτε ποσό από {min} έως {max}
    buyer_email: Το email σου
    buyer_email_hint: Εκεί στέλνουμε την απόδειξη
    recipient_email: Email παραλήπτη
    recipient_name: Όνομα παραλήπτη
    sender_name: Από
    message: Μήνυμα
    message_placeholder: Ένα προσωπικό μήνυμα για τον παραλήπτη (προαιρετικό)
    send: Αποστολή
    send_now: Τώρα
    send_date: Σε συγκεκριμένη ημερομηνία
    payment_method: Τρόπος πληρωμής
  summary:
    amount: Ποσό
    to: Παραλήπτης
    delivery: Παράδοση
    right_away: Αμέσως μετά την πληρωμή
  providers:
    viva_wallet: Viva Wallet
    viva_wallet_hint: Κάρτα, Google Pay ή IRIS μέσω Viva
    stripe: Κάρτα (Stripe)
    stripe_hint: Πληρωμή με κάρτα στη σελίδα μας
  benefits:
    delivery:
      title: Παράδοση με email
      description: Αμέσως ή την ημέρα που θα διαλέξεις.
    balance:
      title: Χρήση σε πολλές παραγγελίες
      description: Το υπόλοιπο περνάει στην επόμενη παραγγελία.
  success:
    title: Η αγορά ολοκληρώθηκε!
    description: Η δωροκάρτα θα σταλεί στο {email} μόλις επιβεβαιωθεί η πληρωμή
  errors:
    purchase_failed: Η αγορά δεν μπόρεσε να ξεκινήσει
    payment_failed: Η πληρωμή απέτυχε — δοκίμασε ξανά
    stripe_init: Αδυναμία φόρτωσης του συστήματος πληρωμών
    no_provider: Δεν υπάρχει διαθέσιμος τρόπος online πληρωμής
  validation:
    required: Υποχρεωτικό πεδίο
    email: Μη έγκυρο email
    amount_required: Συμπλήρωσε ποσό
    amount_min: Ελάχιστο ποσό {min} €
    amount_max: Μέγιστο ποσό {max} €
    message_max: Το μήνυμα είναι πολύ μεγάλο
    date_required: Διάλεξε ημερομηνία από αύριο και μετά
en:
  title: Gift cards
  description: The easy present for anyone with a phone. Spend online on anything in the shop.
  continue: Continue
  continue_to_payment: Continue to payment · {amount}
  back: Back
  payment_title: Pay {amount}
  pay_now: Pay {amount}
  steps:
    amount: Amount
    recipient: Recipient
    payment: Payment
  fields:
    amount: Amount
    amount_other: Other
    amount_hint: Any amount from {min} to {max}
    buyer_email: Your email
    buyer_email_hint: We send the receipt here
    recipient_email: Recipient's email
    recipient_name: Recipient's name
    sender_name: From
    message: Message
    message_placeholder: A personal message for the recipient (optional)
    send: Send
    send_now: Now
    send_date: On a date
    payment_method: Payment method
  summary:
    amount: Amount
    to: To
    delivery: Delivery
    right_away: Right after payment
  providers:
    viva_wallet: Viva Wallet
    viva_wallet_hint: Card, Google Pay or IRIS through Viva
    stripe: Card (Stripe)
    stripe_hint: Pay by card on our own page
  benefits:
    delivery:
      title: Delivered by email
      description: Instantly, or on the date you choose.
    balance:
      title: Spend it in parts
      description: The balance carries over to the next order.
  success:
    title: Purchase complete
    description: The gift card will be sent to {email} as soon as the payment is confirmed
  errors:
    purchase_failed: The purchase could not be started
    payment_failed: The payment failed — please try again
    stripe_init: The payment system could not be loaded
    no_provider: No online payment method is available
  validation:
    required: This field is required
    email: Not a valid email address
    amount_required: Please enter an amount
    amount_min: The minimum amount is {min} €
    amount_max: The maximum amount is {max} €
    message_max: That message is too long
    date_required: Pick a date from tomorrow on
</i18n>
