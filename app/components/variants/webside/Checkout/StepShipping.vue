<script lang="ts" setup>
import type { FormError } from '@nuxt/ui'

const formState = defineModel<Record<string, any>>('formState', { required: true })

const props = defineProps<{
  schema: any
  // Live, priority-sorted carrier options from
  // ``/api/v1/shipping/options``; the cards follow their order
  // (``useCheckoutShippingStep``).
  apiOptions: ShippingOption[]
  /**
   * The checkout quote's ``shippingOptions``: what each delivery costs
   * this cart, the only price a card states (``useCheckoutShippingStep``).
   */
  quotedOptions: readonly QuoteShippingOption[] | null
  /** A new quote is on its way: the locker picker waits for its size. */
  quotePending?: boolean
  /**
   * Set when the live ``/api/v1/shipping/options`` fetch failed.
   * There is no local flat-rate fallback price anymore, so the whole
   * step renders a retry prompt instead of a picker with no prices.
   */
  optionsError?: boolean
  /**
   * Set when the cart is over the weight cap of EVERY method offered
   * (``useCheckoutForm``'s ``shippingOverWeight``). Every card is then
   * disabled, so the step says why once, above them.
   */
  overWeight?: ShippingOverWeight | null
  regionOptions: Array<{ label: string, value: string }>
  /** The selected country's ``postalCodeExample``, the postcode placeholder. */
  postcodeExample?: string
  /** The ``Country`` row of ``formState.country``: whether a region applies. */
  selectedCountry?: Country | null
  /** Whether the store has an ACS contract (the address suggestion). */
  acsEnabled: boolean
  /** The store's ``b2bInvoicing`` feature: whether an invoice is offered. */
  b2bInvoicingEnabled: boolean
  /** ``saved``: the address came from the shopper's address book. */
  mode?: 'saved' | 'new'
  /** The picked saved address, whose fields this step marks if they fail. */
  selectedSavedAddressId?: number | null
  /**
   * Django's field errors from a rejected order (the address, the pickup
   * point, the invoice), shown under their inputs through ``setErrors``.
   */
  serverErrors?: FormError[]
}>()

const emit = defineEmits<{
  'next': []
  'back': []
  'retry-options': []
}>()

const { t, n } = useStoreI18n('components/variants/webside/Checkout/StepShipping')
const localePath = useLocalePath()

const formRef = useTemplateRef<{
  submit: () => Promise<void>
  validate: (opts?: { name?: string | string[], silent?: boolean }) => Promise<unknown>
  setErrors: (errors: FormError[]) => void
}>('formRef')

const {
  shippingOptions,
  activeCarrier,
  lockerCompartmentSize,
  pickerOpen,
  submit,
} = useCheckoutShippingStep({
  formState,
  apiOptions: () => props.apiOptions,
  quotedOptions: () => props.quotedOptions,
  quotePending: () => props.quotePending,
  optionsError: () => props.optionsError,
  form: formRef,
})

const homeDelivery = computed(() => formState.value.shippingMethod === 'home_delivery')

// The step mounts after a rejected order sends the shopper back here,
// so apply on mount as well as on change.
const applyServerErrors = () => {
  if (props.serverErrors?.length) formRef.value?.setErrors(props.serverErrors)
}
onMounted(applyServerErrors)
watch(() => props.serverErrors, applyServerErrors)

// A picked saved address the delivery rules refuse (saved before a rule
// existed): mark its fields on arrival rather than wait for «Continue».
// Django's own messages, when an order came back rejected, are the ones
// to show: validating those fields again would replace them.
async function markSavedAddressErrors() {
  if (!homeDelivery.value || props.selectedSavedAddressId == null || props.serverErrors?.length) return
  await formRef.value?.validate({ name: [...DELIVERY_ADDRESS_FIELDS], silent: true })
}
onMounted(markSavedAddressErrors)
watch(homeDelivery, markSavedAddressErrors, { flush: 'post' })

// The sidebar CTA calls this to validate the step and move on.
defineExpose({ submit })
</script>

<template>
  <UCard class="overflow-hidden">
    <template #header>
      <h2 class="text-xl font-semibold">
        {{ t('shipping.method.title') }}
      </h2>
      <p
        class="
          mt-1 text-sm text-neutral-700
          dark:text-neutral-200
        "
      >
        {{ t('subtitle') }}
      </p>
    </template>

    <!-- Live options failed to load — there is no local price to fall
         back to, so retry is the only path forward; the sidebar CTA
         (which proxies through ``submit()``) is blocked the same way. -->
    <UAlert
      v-if="optionsError"
      color="error"
      variant="subtle"
      icon="i-heroicons-exclamation-triangle"
      :title="t('shipping.method.options_error_title')"
      :description="t('shipping.method.options_error_description')"
      :actions="[
        { label: t('retry'), color: 'neutral', variant: 'outline', onClick: () => emit('retry-options') },
        { label: t('back'), color: 'neutral', variant: 'ghost', onClick: () => emit('back') },
      ]"
    />

    <!-- The sidebar CTA calls the exposed ``submit()``, which opens the
         picker when no locker is picked yet (the Zod ``superRefine``
         would otherwise only mark the field) and else submits this
         form: the method, the point or a home delivery's address, and
         the receipt or invoice. -->
    <UForm
      v-else ref="formRef" :state="formState" :schema="schema" class="space-y-6" @error="scrollToFirstFormError"
      @submit="emit('next')"
    >
      <!-- No method can carry the cart (Django would refuse the order):
           each card names its own limit, this says what to do about it.
           Advancing is already blocked — every card is disabled. -->
      <UAlert
        v-if="overWeight"
        data-testid="step-shipping-over-weight"
        color="error"
        variant="subtle"
        icon="i-heroicons-scale"
        :title="t('shipping.method.over_weight_title')"
        :description="t('shipping.method.over_weight_description', overWeight)"
        :actions="[
          { label: t('shipping.method.over_weight_contact'), color: 'neutral', variant: 'outline', to: localePath('contact'), target: '_blank' },
        ]"
      />

      <!-- Shipping method radio group -->
      <URadioGroup
        v-model="formState.shippingMethod"
        :items="shippingOptions"
        variant="card"
        size="xl"
        class="w-full"
        :ui="{
          item: 'flex cursor-pointer items-start gap-3 p-4',
          wrapper: 'ms-3',
        }"
      >
        <template #label="{ item }">
          <div
            class="
              flex flex-1 items-start gap-2
              sm:gap-3
            "
          >
            <ImgWithFallback
              :src="item.logo"
              :alt="item.altText"
              width="96"
              height="66"
              fit="contain"
              format="webp"
              :modifiers="{ background: 'transparent' }"
              class="
                h-8 w-16 shrink-0 object-contain
                sm:h-10 sm:w-24
              "
            />
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <!-- ``flex-wrap`` lets the tagline badge break to a second
                   line on narrow viewports instead of overflowing.
                   ``min-w-0 + break-words`` lets the label itself wrap
                   when the brand name + tagline don't fit one row. -->
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span class="font-semibold wrap-break-word">{{ item.label }}</span>
                <UBadge
                  v-if="item.taglineKey"
                  size="sm"
                  variant="soft"
                  :color="item.taglineColor ?? 'info'"
                  class="shrink-0"
                >
                  {{ t(item.taglineKey) }}
                </UBadge>
              </div>
              <span
                class="
                  text-sm text-neutral-700
                  dark:text-neutral-200
                "
              >
                {{ item.descriptionText }}
              </span>
              <!-- A payment method this delivery choice is the only way
                   to reach. Named here because the payment step comes
                   next: a shopper who wants BOX NOW Αντικαταβολή would
                   otherwise have to guess that a locker unlocks it. -->
              <span
                v-if="item.exclusivePayWays.length"
                class="mt-1 flex flex-wrap items-center gap-1 text-sm"
              >
                <span
                  class="
                    text-neutral-600
                    dark:text-neutral-300
                  "
                >
                  {{ t('delivery_unlocks_payment') }}
                </span>
                <UBadge
                  v-for="payWay in item.exclusivePayWays"
                  :key="payWay"
                  color="success"
                  variant="subtle"
                  size="sm"
                >
                  {{ payWay }}
                </UBadge>
              </span>
              <!-- Why this row can't be picked right now: a cart over
                   the method's weight cap, or too large for its
                   parcels. -->
              <span
                v-if="item.disabledReason"
                class="mt-1 text-sm text-error"
              >
                {{ item.disabledReason }}
              </span>
            </div>
            <!-- The price is the quote's: "Free" only when it is 0, a dash
                 while the quote has none for this card. -->
            <span
              v-if="item.price === 0"
              class="shrink-0 font-semibold text-success"
            >
              {{ t('free') }}
            </span>
            <span
              v-else
              class="shrink-0 font-semibold"
            >
              {{ item.price === null ? '—' : n(item.price, 'currency') }}
            </span>
          </div>
        </template>
      </URadioGroup>

      <!-- The chosen carrier's locker picker: one for every carrier,
           fed by Django's catalogue (``fetchAll``). Home delivery has
           no carrier here and no picker. -->
      <template v-if="activeCarrier">
        <UFormField :name="activeCarrier.formFieldName" class="mt-0">
          <WebsideCheckoutSelectedGenericLocker
            v-model:formState="formState"
            v-model:open="pickerOpen"
            :carrier="activeCarrier"
            :initial-postal-code="formState.zipcode"
            :initial-city="formState.city"
            :country-code="formState.country"
            :compartment-size="lockerCompartmentSize"
          />
        </UFormField>
      </template>

      <!-- A home delivery's address; a pickup order is delivered to the
           point and asks for none. -->
      <template v-if="homeDelivery">
        <USeparator />
        <WebsideCheckoutDeliveryAddress
          v-model:form-state="formState"
          :region-options="regionOptions"
          :postcode-example="postcodeExample"
          :selected-country="selectedCountry"
          :acs-enabled="acsEnabled"
          :mode="mode"
        />
      </template>

      <template v-if="b2bInvoicingEnabled">
        <USeparator />
        <WebsideCheckoutDocumentChoice v-model:form-state="formState" />
      </template>

      <!-- Footer navigation. Continue lives in the checkout sidebar
           so the primary CTA sits next to the order total. -->
      <div class="flex items-center pt-4">
        <UButton
          variant="ghost"
          icon="i-heroicons-arrow-left"
          type="button"
          data-testid="step-shipping-back"
          @click="emit('back')"
        >
          {{ t('back') }}
        </UButton>
      </div>
    </UForm>
  </UCard>
</template>

<i18n lang="yaml">
el:
  subtitle: Επιλέξτε πώς θέλετε να παραλάβετε την παραγγελία σας
  back: Πίσω
  retry: Δοκιμάστε ξανά
  free: Δωρεάν
en:
  subtitle: Choose how you want to receive your order
  back: Back
  retry: Try again
  free: Free
</i18n>
