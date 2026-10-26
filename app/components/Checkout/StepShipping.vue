<script lang="ts" setup>
const formState = defineModel<Record<string, any>>('formState', { required: true })

const props = defineProps<{
  schema: any
  partnerId: string
  // Live, priority-sorted carrier options from
  // ``/api/v1/shipping/options``; the cards follow their order
  // (``useCheckoutShippingStep``).
  apiOptions: ShippingOption[]
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
}>()

const emit = defineEmits<{
  'next': []
  'back': []
  'retry-options': []
}>()

const { t, n } = useI18n()
const headingId = useId()
const localePath = useLocalePath()

const formRef = useTemplateRef<{
  validate: (opts?: { name?: string | string[], silent?: boolean }) => Promise<unknown>
}>('formRef')

const {
  isBoxNowConfigured,
  boxnowAvailable,
  shippingOptions,
  activeCarrier,
  freeDeliveryApplied,
  isBoxNow,
  pickerOpen,
  submit,
} = useCheckoutShippingStep({
  formState,
  apiOptions: () => props.apiOptions,
  partnerId: () => props.partnerId,
  optionsError: () => props.optionsError,
  form: formRef,
  onNext: () => emit('next'),
})

/**
 * A business-day estimate as copy. Django allows 0 (dispatch the same
 * day), so the ends are not always a plain "N–M": 0–0 is "same business
 * day", and a range starting at 0 is "up to M" (a "0–2 days" reads as
 * a typo).
 */
function estimateText({ min, max }: { min: number, max: number }): string {
  if (max === 0) return t('estimate_same_day')
  if (min === 0) return t('estimate_up_to', { count: max }, max)
  if (min === max) return t('estimate_days', { count: max }, max)
  return t('estimate_range', { min, max })
}

// The page's primary button calls this to validate the step and move on.
defineExpose({ submit })
</script>

<template>
  <section
    :aria-labelledby="headingId"
    class="flex flex-col gap-5 rounded-[1.25rem] bg-default p-5 ring ring-default sm:p-6"
  >
    <h2
      :id="headingId"
      class="font-display text-[1.375rem] font-bold text-highlighted"
    >
      {{ t('shipping.method.title') }}
    </h2>

    <!-- Live options failed to load — there is no local price to fall
         back to, so retry is the only path forward; the page's CTA
         (which proxies through ``submit()``) is blocked the same way. -->
    <UAlert
      v-if="optionsError"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="t('shipping.method.options_error_title')"
      :description="t('shipping.method.options_error_description')"
      :actions="[
        { label: t('retry'), color: 'neutral', variant: 'outline', onClick: () => emit('retry-options') },
        { label: t('back'), color: 'neutral', variant: 'ghost', onClick: () => emit('back') },
      ]"
    />

    <!-- ``@submit`` is intentionally absent: the page's CTA calls the
         exposed ``submit()`` because the Zod ``superRefine`` would
         otherwise abort submit on a missing locker before our handler
         could pop the picker. The schema still drives inline error
         rendering for the locker field via the watcher above. -->
    <UForm v-else ref="formRef" :state="formState" :schema="schema" class="flex flex-col gap-4" @error="scrollToFirstFormError">
      <!-- No method can carry the cart (Django would refuse the order):
           each card names its own limit, this says what to do about it.
           Advancing is already blocked — every card is disabled. -->
      <UAlert
        v-if="overWeight"
        data-testid="step-shipping-over-weight"
        color="error"
        variant="subtle"
        icon="i-lucide-scale"
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
          item: 'flex cursor-pointer items-center gap-3 p-4',
          wrapper: 'ms-3 w-full',
        }"
      >
        <template #label="{ item }">
          <div class="flex flex-1 items-center gap-3">
            <div
              class="
                flex h-11 w-16 shrink-0 items-center justify-center rounded-lg
                bg-white p-1 ring ring-default
                sm:w-20
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
                class="size-full object-contain"
              />
            </div>
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <!-- ``flex-wrap`` lets the tagline badge break to a second
                   line on narrow viewports instead of overflowing.
                   ``min-w-0 + break-words`` lets the label itself wrap
                   when the brand name + tagline don't fit one row. -->
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span class="font-semibold break-words text-highlighted">{{ item.label }}</span>
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
              <span class="text-sm text-toned">
                {{ item.descriptionText }}
              </span>
              <span
                v-if="item.estimate"
                class="text-sm text-toned"
              >
                {{ estimateText(item.estimate) }}
              </span>
              <!-- A payment method this delivery choice is the only way
                   to reach. Named here because the payment step comes
                   next: a shopper who wants BOX NOW Αντικαταβολή would
                   otherwise have to guess that a locker unlocks it. -->
              <span
                v-if="item.exclusivePayWays.length"
                class="mt-1 flex flex-wrap items-center gap-1 text-sm"
              >
                <span class="text-toned">
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
              <!-- Why this row can't be picked right now — an
                   over-cap cart, or (BoxNow only) a delivery country
                   the widget has no map for. Kept separate from the
                   "unconfigured" alert below, which only covers a
                   missing partner id. -->
              <span
                v-if="item.disabledReason"
                class="mt-1 text-sm text-toned"
              >
                {{ item.disabledReason }}
              </span>
            </div>
            <!-- The price is the API's: "Free" only when it is 0. -->
            <UBadge
              v-if="item.price === 0"
              color="success"
              variant="soft"
              class="shrink-0"
              :label="t('free')"
            />
            <span
              v-else
              class="shrink-0 font-mono font-semibold text-highlighted"
            >
              {{ n(item.price, 'currency') }}
            </span>
          </div>
        </template>
      </URadioGroup>

      <!-- Configuration explainer — only in dev when BoxNow partnerId is
           missing AND BoxNow is supposed to be visible. -->
      <UAlert
        v-if="!isBoxNowConfigured && boxnowAvailable"
        color="info"
        variant="subtle"
        icon="i-lucide-info"
        :title="t('shipping.method.boxnow.unconfigured_title')"
        :description="t('shipping.method.boxnow.unconfigured_description')"
      />

      <!-- Provider-aware locker picker dispatch.
           BoxNow keeps its iframe widget (``usesGenericPicker:false``).
           Every other carrier with ``usesGenericPicker:true`` mounts
           the generic picker — no provider-specific branch survives
           in this template. -->
      <template v-if="activeCarrier && !activeCarrier.usesGenericPicker && isBoxNow">
        <UFormField :name="activeCarrier.formFieldName" class="mt-0">
          <CheckoutSelectedBoxNowLocker
            v-model:formState="formState"
            v-model:open="pickerOpen"
            :partner-id="props.partnerId"
          />
        </UFormField>
      </template>

      <template v-else-if="activeCarrier?.usesGenericPicker">
        <UFormField :name="activeCarrier.formFieldName" class="mt-0">
          <CheckoutSelectedGenericLocker
            v-model:formState="formState"
            v-model:open="pickerOpen"
            :carrier="activeCarrier"
            :initial-postal-code="formState.zipcode"
            :initial-city="formState.city"
            :country-code="formState.country"
          />
        </UFormField>
      </template>

      <!-- Free delivery for the chosen method. The page draws Back and
           Continue under this card. -->
      <div
        v-if="freeDeliveryApplied"
        data-testid="step-shipping-free-delivery"
        class="
          flex items-start gap-3 rounded-xl bg-(--ui-volt-soft) p-4
          text-highlighted ring ring-(--ui-volt-edge)
        "
      >
        <UIcon name="i-lucide-truck" class="mt-0.5 size-5 shrink-0" />
        <div class="flex flex-col gap-0.5">
          <p class="font-semibold">
            {{ t('free_delivery_title') }}
          </p>
          <p class="text-sm">
            {{ t('free_delivery_description') }}
          </p>
        </div>
      </div>
    </UForm>
  </section>
</template>

<i18n lang="yaml">
el:
  back: Πίσω
  retry: Δοκιμάστε ξανά
  free: Δωρεάν
  estimate_days: "{count} εργάσιμη ημέρα | {count} εργάσιμες ημέρες"
  estimate_range: "{min}–{max} εργάσιμες ημέρες"
  estimate_same_day: Την ίδια εργάσιμη
  estimate_up_to: "Έως {count} εργάσιμη ημέρα | Έως {count} εργάσιμες ημέρες"
  free_delivery_title: Εφαρμόστηκε δωρεάν αποστολή
  free_delivery_description: Η παραγγελία σου δικαιούται δωρεάν αποστολή με αυτή τη μέθοδο.
en:
  back: Back
  retry: Try again
  free: Free
  estimate_days: "{count} business day | {count} business days"
  estimate_range: "{min}–{max} business days"
  estimate_same_day: Same business day
  estimate_up_to: "Up to {count} business day | Up to {count} business days"
  free_delivery_title: Free delivery applied
  free_delivery_description: Your order qualifies for free delivery with this method.
</i18n>
