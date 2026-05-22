<script lang="ts" setup>
const formState = defineModel<Record<string, any>>('formState', { required: true })

const props = defineProps<{
  schema: any
  partnerId: string
  // Live, priority-sorted carrier options from
  // ``/api/v1/shipping/options`` (already filtered by the backend
  // to active ``ShippingProvider`` rows + per-kind feature flags
  // like ``ACS_SMARTPOINT_ENABLED``). The display order here mirrors
  // ``ShippingProvider.priority`` ascending — admins control which
  // method appears first by editing the provider rows in Django
  // admin instead of editing this component.
  apiOptions: ShippingOption[]
  // The currently selected PayWay (from useCheckoutForm). Threaded
  // through as a prop so we can disable the BoxNow option when the
  // shopper has a cash-on-delivery PayWay selected — BoxNow lockers
  // do not support COD (no POS at lockers per BoxNow policy).
  selectedPayWay?: { id: number, isOnlinePayment?: boolean } | null
}>()

const emit = defineEmits<{
  next: []
  back: []
}>()

const { t } = useI18n()

// True when the BoxNow widget is unconfigured (NUXT_PUBLIC_BOXNOW_PARTNER_ID
// missing from the deploy environment). We disable the BoxNow option in
// that case so the shopper never reaches the picker — which would throw
// "partnerId is required" from buildBoxNowIframeUrl and bubble up as the
// generic checkout error toast.
const isBoxNowConfigured = computed(() => Boolean(props.partnerId))

// Mirrors the visibility decision in ``useCheckoutForm`` so the
// "BoxNow is unconfigured" alert below only renders when the
// shopper actually has BoxNow as a candidate method (otherwise
// it'd surface on every checkout in environments without BoxNow).
const boxnowAvailable = computed(() =>
  props.apiOptions.some(o => o.providerCode === 'boxnow'),
)

// BoxNow supports COD on lockers via PAY ON THE GO — the backend
// wires ``paymentMode='cod'`` + ``amountToBeCollected`` onto the
// voucher when the order's pay-way is offline (see
// ``shipping_boxnow/carrier.py:create_shipment_row``). The row is
// only disabled when ``NUXT_PUBLIC_BOXNOW_PARTNER_ID`` is missing
// from the deploy env.
const isBoxNowDisabled = computed(() => !isBoxNowConfigured.value)

// Note: ``description`` is rendered inside the custom ``#label`` slot
// below — we deliberately omit it from the item objects so URadioGroup
// doesn't ALSO render it as a separate ``data-slot="description"``
// paragraph (which would duplicate the text on the card).
//
// Brand metadata (icon, optional badge tagline) lives in
// ``app/utils/shipping-methods.ts``. ``logo`` is sourced per-API-row
// from ``ShippingOption.logoUrl`` (operator upload via Django admin)
// with a single bundled fallback — see ``resolveShippingLogo``.
type ShippingOptionItemBase = {
  value: ShippingMethodKey
  label: string
  descriptionText: string
  altText: string
  icon: string
  taglineKey?: string
  taglineColor?: ShippingMethodMeta['taglineColor']
  disabled?: boolean
}

type ShippingOptionItem = ShippingOptionItemBase & {
  logo: string
}

// Per-method UI metadata (i18n labels + brand assets +
// per-instance ``disabled`` reasons). Methods absent from
// ``apiOptions`` are filtered out below — Django decides which
// rows to surface based on ``ShippingProvider.is_active`` and any
// per-kind Setting flags (``ACS_SMARTPOINT_ENABLED``, etc.). The
// UI only handles rendering + ``disabled`` reasons local to the
// browser environment (e.g. missing BoxNow ``partnerId``).
const itemsByKey = computed<Record<ShippingMethodKey, ShippingOptionItemBase>>(
  () => ({
    home_delivery: {
      value: 'home_delivery',
      label: t('shipping.method.home_delivery.label'),
      descriptionText: t('shipping.method.home_delivery.description'),
      ...buildBrandMeta('home_delivery'),
    },
    box_now_locker: {
      value: 'box_now_locker',
      label: t('shipping.method.boxnow.label'),
      descriptionText: t('shipping.method.boxnow.description'),
      disabled: isBoxNowDisabled.value,
      ...buildBrandMeta('box_now_locker'),
    },
    acs_smartpoint: {
      value: 'acs_smartpoint',
      label: t('shipping.method.acs_smartpoint.label'),
      descriptionText: t('shipping.method.acs_smartpoint.description'),
      ...buildBrandMeta('acs_smartpoint'),
    },
  }),
)

// Render in the priority order the backend already produced. The
// backend sorts ``/api/v1/shipping/options`` by
// ``(ShippingProvider.priority, provider_code)`` ascending — admins
// reorder the picker by editing those priority values in Django
// admin. Duplicate ``methodKey`` values are de-duped (only the
// first occurrence wins) because we collapse all home-delivery
// providers to a single ``'home_delivery'`` UI row.
//
// The logo is sourced from the API row's ``logoUrl`` (operator
// upload via Django admin) and falls back to the single bundled
// ``DEFAULT_SHIPPING_LOGO`` SVG when the backend hasn't supplied
// one. The first-occurrence-wins rule applies to both the row
// identity AND the logo source, so swapping the active home-
// delivery carrier propagates the new brand asset automatically.
const shippingOptions = computed(() => {
  const seen = new Set<ShippingMethodKey>()
  const ordered: ShippingOptionItem[] = []
  for (const option of props.apiOptions) {
    const key = methodKeyForOption(option) as ShippingMethodKey | null
    if (!key || seen.has(key)) continue
    const baseItem = itemsByKey.value[key]
    if (!baseItem) continue
    seen.add(key)
    ordered.push({
      ...baseItem,
      logo: resolveShippingLogo(option.logoUrl),
    })
  }
  return ordered
})

function buildBrandMeta(method: ShippingMethodKey) {
  const meta = getShippingMethodMeta(method)
  // ``logo`` is filled in by the caller from the matching
  // ``ShippingOption.logoUrl`` (via ``resolveShippingLogo``) so this
  // helper only emits the static i18n + icon hints; the brand asset
  // is whatever the operator uploaded in Django admin, or the single
  // bundled default when nothing is uploaded.
  return {
    altText: t(meta.altKey),
    icon: meta.icon,
    taglineKey: meta.taglineKey,
    taglineColor: meta.taglineColor,
  }
}

// Active carrier for the current ``shippingMethod`` (or ``null`` for
// ``home_delivery``, which has no provider-specific picker). The
// dispatch lives in the registry — adding a new courier doesn't
// require any changes here.
const activeCarrier = computed(() =>
  carrierForMethod(formState.value.shippingMethod),
)

const isBoxNow = computed(
  () => formState.value.shippingMethod === 'box_now_locker',
)

// Single source of truth for the active carrier's picker modal. The
// child wrappers (CheckoutSelectedBoxNowLocker /
// CheckoutSelectedGenericLocker) only render one at a time, so a
// shared ref is safe and lets the Continue button open the right
// picker when the shopper hasn't picked a locker yet.
const pickerOpen = ref(false)

const isLockerMissing = computed(() => {
  const carrier = activeCarrier.value
  if (!carrier) return false
  return carrier.readLockerId(formState.value) === null
})

// UForm template ref so we can re-run validation programmatically.
// UForm only re-validates in response to native input/change/blur events
// from form inputs — picking a locker via the modal mutates form state
// without firing any of those, so the stale "Παρακαλώ επιλέξτε ένα
// Smartpoint…" error would otherwise stick around even though the
// schema is now satisfied. The watcher below validates the locker
// field after every selection so the inline error clears the moment
// the shopper picks one.
const formRef = useTemplateRef<{
  validate: (opts?: { name?: string | string[], silent?: boolean }) => Promise<unknown>
}>('formRef')

watch(
  () => activeCarrier.value?.readLockerId(formState.value),
  async (lockerId) => {
    if (!lockerId || !activeCarrier.value || !formRef.value) return
    try {
      await formRef.value.validate({
        name: activeCarrier.value.formFieldName,
        silent: true,
      })
    }
    catch {
      // ``silent: true`` already swallows surface errors; the
      // catch is a final guard for unexpected throws so a picker
      // selection never crashes the whole shipping step.
    }
  },
)

// Clear all carriers' locker state when the shipping method changes
// to anything that doesn't own them. Prevents orphan locker IDs from
// leaking into the order payload after the shopper switches options.
const PROVIDER_FORM_KEYS: Record<string, string[]> = {
  acs_smartpoint: [
    'acsStationExternalId',
    'acsStationBranch',
    'acsStation',
  ],
  box_now_locker: ['boxnowLockerId', 'boxnowLocker'],
}

watch(
  () => formState.value.shippingMethod,
  (method) => {
    for (const [owningMethod, keys] of Object.entries(PROVIDER_FORM_KEYS)) {
      if (method === owningMethod) continue
      for (const key of keys) {
        formState.value[key]
          = key.endsWith('Id') || key.endsWith('Branch') ? '' : null
      }
    }
  },
)

function onSubmit() {
  // Continue clicked without picking a locker → pop the picker
  // instead of silently failing. The previous UX disabled the button
  // entirely, which gave no signal about what was missing — a real
  // customer (order 53, 2026-05-12) bounced to ACS after staring at
  // a disabled BoxNow Continue button for ~50 minutes.
  if (isLockerMissing.value) {
    pickerOpen.value = true
    return
  }
  emit('next')
}

// Surfaces the existing onSubmit to the page-level CTA in the
// sidebar so it can drive the locker-aware validation flow.
defineExpose({ submit: onSubmit })
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

    <!-- ``@submit`` is intentionally absent: the Continue button uses
         ``type="button"`` + ``@click`` because the Zod
         ``superRefine`` would otherwise abort submit on a missing
         locker before our handler could pop the picker. The schema
         still drives inline error rendering for the locker field via
         the watcher below. -->
    <UForm ref="formRef" :state="formState" :schema="schema" class="space-y-6">
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
</i18n>
