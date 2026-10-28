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

const { t } = useStoreI18n('components/variants/webside/Checkout/StepShipping')
const localePath = useLocalePath()

const formRef = useTemplateRef<{
  validate: (opts?: { name?: string | string[], silent?: boolean }) => Promise<unknown>
}>('formRef')

const {
  isBoxNowConfigured,
  boxnowAvailable,
  shippingOptions,
  activeCarrier,
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

// The sidebar CTA calls this to validate the step and move on.
defineExpose({ submit })
</script>

<template>
  <UCard class="overflow-hidden">
    <template #header>
      <h2 class="text-xl font-semibold">
        {{ t('shipping.method.title') }}
      </h2>
      <p class="mt-1 text-sm text-neutral-700 dark:text-neutral-200">
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

    <!-- ``@submit`` is intentionally absent: the Continue button uses
         ``type="button"`` + ``@click`` because the Zod
         ``superRefine`` would otherwise abort submit on a missing
         locker before our handler could pop the picker. The schema
         still drives inline error rendering for the locker field via
         the watcher below. -->
    <UForm v-else ref="formRef" :state="formState" :schema="schema" class="space-y-6" @error="scrollToFirstFormError">
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
          <div class="flex flex-1 items-start gap-2 sm:gap-3">
            <ImgWithFallback
              :src="item.logo"
              :alt="item.altText"
              width="96"
              height="66"
              fit="contain"
              format="webp"
              :modifiers="{ background: 'transparent' }"
              class="h-8 w-16 shrink-0 object-contain sm:h-10 sm:w-24"
            />
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <!-- ``flex-wrap`` lets the tagline badge break to a second
                   line on narrow viewports instead of overflowing.
                   ``min-w-0 + break-words`` lets the label itself wrap
                   when the brand name + tagline don't fit one row. -->
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span class="break-words font-semibold">{{ item.label }}</span>
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
              <span class="text-sm text-neutral-700 dark:text-neutral-200">
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
                <span class="text-neutral-600 dark:text-neutral-300">
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
                class="mt-1 text-sm text-error"
              >
                {{ item.disabledReason }}
              </span>
            </div>
          </div>
        </template>
      </URadioGroup>

      <!-- Configuration explainer — only in dev when BoxNow partnerId is
           missing AND BoxNow is supposed to be visible. -->
      <UAlert
        v-if="!isBoxNowConfigured && boxnowAvailable"
        color="info"
        variant="subtle"
        icon="i-heroicons-information-circle"
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
          <WebsideCheckoutSelectedBoxNowLocker
            v-model:formState="formState"
            v-model:open="pickerOpen"
            :partner-id="props.partnerId"
          />
        </UFormField>
      </template>

      <template v-else-if="activeCarrier?.usesGenericPicker">
        <UFormField :name="activeCarrier.formFieldName" class="mt-0">
          <WebsideCheckoutSelectedGenericLocker
            v-model:formState="formState"
            v-model:open="pickerOpen"
            :carrier="activeCarrier"
            :initial-postal-code="formState.zipcode"
            :initial-city="formState.city"
            :country-code="formState.country"
          />
        </UFormField>
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
</i18n>
