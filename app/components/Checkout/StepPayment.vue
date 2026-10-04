<script lang="ts" setup>
/**
 * Checkout step 3, as the board draws it: the payment-method card (one
 * radio card per pay way), then a Review card that reads back what the
 * earlier steps chose and holds the terms consent.
 *
 * The page owns the navigation row — "Back" and the Pay / Place order
 * button sit under this step and call the exposed `submit()`. Paying
 * needs the terms accepted: until they are, `submit()` shows the consent
 * message and emits nothing (no schema covers it, so the gate is here).
 * Past that it validates the chosen pay way with `schema` and emits
 * `submit`; while `isSubmitting` it does nothing, so a second tap on Pay
 * cannot place a second order.
 */
const formState = defineModel<Record<string, any>>('formState', { required: true })

const props = withDefaults(defineProps<{
  schema: any
  payWayOptions: Array<{
    label: string
    value: number
    /** The pay way's own name, without the surcharge suffix `label` carries. */
    name?: string
    /** The surcharge actually charged now (0 once waived); shown beside the name. */
    cost?: number
    providerCode?: string
    settlement?: 'online' | 'courier_cash' | 'carrier_terminal' | 'offline_transfer'
    mainImagePath?: string
    isOnlinePayment?: boolean
    /** Operator-authored TinyMCE HTML from Django admin. */
    description?: string
    instructions?: string
    /** "Free above X" — only set while the fee is actually charged. */
    freeThresholdHint?: string
  }>
  isSubmitting: boolean
  /** Whether Stripe takes the shopper to its own page (else the card form is inline). */
  useHostedCheckout?: boolean
}>(), {
  useHostedCheckout: false,
})

const emit = defineEmits<{
  submit: []
}>()

const { t, n } = useI18n()
const paymentHeadingId = useId()
const reviewHeadingId = useId()

// Card methods are the ones that settle online through a card processor.
const CARD_PROVIDERS = ['viva_wallet', 'stripe']
const CARD_BRANDS = ['VISA', 'MC', 'AMEX']

const SETTLEMENT_ICONS = {
  online: 'i-lucide-credit-card',
  courier_cash: 'i-lucide-banknote',
  carrier_terminal: 'i-lucide-package',
  offline_transfer: 'i-lucide-landmark',
} as const

// The selected card takes the accent: a ring and the soft accent tint.
const PAY_WAY_UI = {
  fieldset: 'flex flex-col gap-3',
  // The card's heading already says it on screen; the legend still names
  // the group for assistive tech.
  legend: 'sr-only',
  item: [
    'items-start',
    'has-data-[state=checked]:border-secondary',
    'has-data-[state=checked]:bg-(--ui-secondary-soft)',
    'has-data-[state=checked]:ring-1',
    'has-data-[state=checked]:ring-secondary',
  ].join(' '),
  wrapper: 'min-w-0 flex-1',
}

const INSTRUCTIONS_TRIGGER_UI = {
  base: 'justify-between',
  trailingIcon: 'transition-transform duration-200 group-data-[state=open]:rotate-180',
}

const items = computed(() => props.payWayOptions.map(option => ({
  ...option,
  title: option.name ?? option.label,
  icon: SETTLEMENT_ICONS[option.settlement ?? 'online'],
  isCard: CARD_PROVIDERS.includes(option.providerCode ?? ''),
  hasCost: (option.cost ?? 0) > 0,
})))

// Instructions belong to ONE method — the chosen one — so they render
// once below the group rather than inside every card. Keeping them out
// of the radio list also keeps them out of its `overflow-y-auto`
// container, where an expanding block fights the scroll position.
const selectedPayWay = computed(() =>
  props.payWayOptions.find(option => option.value === formState.value.payWay),
)

// What the shopper should expect once they pay, for the methods that
// take them somewhere. The others say nothing beyond their description.
const finishLine = computed(() => {
  const code = selectedPayWay.value?.providerCode
  if (code === 'viva_wallet') return t('finish.viva')
  if (code === 'stripe') return props.useHostedCheckout ? t('finish.stripe_hosted') : t('finish.stripe_inline')
  return ''
})

const selectedInstructions = computed(() =>
  sanitizeRichHtml(selectedPayWay.value?.instructions),
)

const hasInstructions = computed(() =>
  selectedInstructions.value.trim().length > 0,
)

// Collapsed by default. The instructions are operator-authored HTML —
// 500-700 characters with a numbered list for the methods that have
// them — and rendering that expanded pushed the order summary and the
// place-order CTA below the fold on a phone, for copy most shoppers
// never need. A one-line trigger keeps it one tap away instead.
const instructionsOpen = ref(false)

// Instructions belong to the SELECTED method, so a method change makes
// whatever is on screen wrong. Collapsing on change also avoids
// swapping the body of an open panel underneath the reader.
watch(() => formState.value.payWay, () => {
  instructionsOpen.value = false
})

const acceptedTerms = ref(false)
const termsMissing = ref(false)
const consentRef = useTemplateRef<HTMLElement>('consentRef')

watch(acceptedTerms, (accepted) => {
  if (accepted) termsMissing.value = false
})

// Expose submit() so the page's Pay button can trigger the consent gate,
// Zod validation and the `submit` emit.
const formRef = useTemplateRef<{ submit: () => Promise<void> }>('formRef')
defineExpose({
  submit: async () => {
    if (props.isSubmitting) return
    if (!acceptedTerms.value) {
      termsMissing.value = true
      consentRef.value?.scrollIntoView({ block: 'center' })
      return
    }
    await formRef.value?.submit()
  },
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <section
      :aria-labelledby="paymentHeadingId"
      class="flex flex-col gap-5 rounded-[1.25rem] bg-default p-5 ring ring-default sm:p-6"
    >
      <h2
        :id="paymentHeadingId"
        class="font-display text-[1.375rem] font-bold text-highlighted"
      >
        {{ t('form.payment_method') }}
      </h2>

      <UForm
        ref="formRef"
        :state="formState"
        :schema="schema"
        class="flex flex-col gap-4"
        @error="scrollToFirstFormError"
        @submit="emit('submit')"
      >
        <UFormField
          name="payWay"
          :ui="{ container: 'mt-0' }"
        >
          <URadioGroup
            v-model="formState.payWay"
            :items="items"
            :legend="t('form.payment_method')"
            :disabled="isSubmitting"
            variant="card"
            color="secondary"
            size="lg"
            class="w-full"
            :ui="PAY_WAY_UI"
          >
            <template #label="{ item }">
              <div class="flex items-center justify-between gap-3">
                <span class="flex min-w-0 items-center gap-3">
                  <ImgWithFallback
                    v-if="item.mainImagePath"
                    class="size-6 shrink-0 object-contain"
                    :src="item.mainImagePath"
                    :width="24"
                    :height="24"
                    fit="contain"
                    :format="'svg'"
                    :background="'transparent'"
                    alt=""
                    densities="x1"
                  />
                  <UIcon
                    v-else
                    :name="item.icon"
                    class="size-5 shrink-0 text-toned"
                  />
                  <span class="font-semibold text-highlighted">{{ item.title }}</span>
                </span>

                <span
                  v-if="item.isCard"
                  class="flex shrink-0 flex-wrap justify-end gap-1.5 max-sm:hidden"
                >
                  <UBadge
                    v-for="brand in CARD_BRANDS"
                    :key="brand"
                    :label="brand"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    class="font-semibold"
                  />
                </span>
                <span
                  v-else-if="item.hasCost"
                  class="shrink-0 font-mono font-semibold text-highlighted"
                >
                  +{{ n(item.cost!, 'currency') }}
                </span>
              </div>
            </template>

            <!-- Operator-authored, so sanitised like every other WYSIWYG
                 field (`sanitizeRichHtml`, same helper the blog body and
                 product description use). Overriding the slot rather than
                 letting `descriptionKey` render it as plain text, which
                 would print the `<div>` wrapper TinyMCE stores. -->
            <template #description="{ item }">
              <div class="ps-8">
                <div
                  v-if="item.description"
                  class="pay-way-description text-sm text-toned"
                  v-html="sanitizeRichHtml(item.description)"
                />
                <p
                  v-if="item.freeThresholdHint"
                  class="mt-1 text-sm font-medium text-toned"
                >
                  {{ item.freeThresholdHint }}
                </p>
                <p
                  v-if="item.value === formState.payWay && finishLine"
                  class="mt-3 flex items-start gap-2 text-sm text-toned"
                >
                  <UIcon
                    name="i-lucide-lock"
                    class="mt-0.5 size-4 shrink-0"
                  />
                  {{ finishLine }}
                </p>
              </div>
            </template>
          </URadioGroup>
        </UFormField>

        <UCollapsible
          v-if="hasInstructions"
          v-model:open="instructionsOpen"
        >
          <UButton
            class="group"
            color="neutral"
            variant="subtle"
            size="md"
            block
            type="button"
            leading-icon="i-lucide-info"
            :label="t('form.payment_instructions')"
            trailing-icon="i-lucide-chevron-down"
            :ui="INSTRUCTIONS_TRIGGER_UI"
          />

          <template #content>
            <div
              class="
                pay-way-instructions mt-2 rounded-lg border border-default
                bg-elevated/50 p-3 text-sm
              "
              v-html="selectedInstructions"
            />
          </template>
        </UCollapsible>
      </UForm>
    </section>

    <section
      :aria-labelledby="reviewHeadingId"
      class="flex flex-col gap-5 rounded-[1.25rem] bg-default p-5 ring ring-default sm:p-6"
    >
      <h2
        :id="reviewHeadingId"
        class="font-display text-[1.375rem] font-bold text-highlighted"
      >
        {{ t('review') }}
      </h2>

      <CheckoutReviewSummary :form-state="formState" />

      <div ref="consentRef">
        <CheckoutTermsConsent
          v-model="acceptedTerms"
          :invalid="termsMissing"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
/* TinyMCE stores ordered/unordered lists; without list-style they
   render as unmarked lines and the numbered steps lose their order. */
.pay-way-instructions :deep(ol) {
  list-style: decimal;
  padding-inline-start: 1.25rem;
}

.pay-way-instructions :deep(ul) {
  list-style: disc;
  padding-inline-start: 1.25rem;
}

.pay-way-instructions :deep(p),
.pay-way-instructions :deep(ol),
.pay-way-instructions :deep(ul) {
  margin-block: 0.375rem;
}

.pay-way-instructions :deep(li) {
  margin-block: 0.125rem;
}
</style>

<i18n lang="yaml">
el:
  review: Επισκόπηση
  form:
    payment_method: Τρόπος πληρωμής
    payment_instructions: Οδηγίες πληρωμής
  finish:
    viva: Θα ολοκληρώσεις την πληρωμή στην ασφαλή σελίδα της Viva Wallet και θα επιστρέψεις εδώ.
    stripe_hosted: Θα ολοκληρώσεις την πληρωμή στην ασφαλή σελίδα της Stripe και θα επιστρέψεις εδώ.
    stripe_inline: Πληρώνεις χωρίς να φύγεις από τη σελίδα.
en:
  review: Review
  form:
    payment_method: Payment method
    payment_instructions: Payment instructions
  finish:
    viva: You'll finish paying on Viva Wallet's secure page, then come straight back here.
    stripe_hosted: You'll finish paying on Stripe's secure page, then come straight back here.
    stripe_inline: Pay without leaving the page.
</i18n>
