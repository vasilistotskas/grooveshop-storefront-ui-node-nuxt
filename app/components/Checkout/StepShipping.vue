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
const { getPaymentMethodName } = usePaymentMethod()
const { cart } = storeToRefs(useCartStore())

// True when the BoxNow widget is unconfigured (tenantStore.boxNowPartnerId
// empty — tenant hasn't set one, no platform fallback). We disable the
// BoxNow option in that case so the shopper never reaches the picker —
// which would throw "partnerId is required" from buildBoxNowIframeUrl
// and bubble up as the generic checkout error toast.
const isBoxNowConfigured = computed(() => Boolean(props.partnerId))

// BoxNow has no country-agnostic widget host — a country outside
// ``BOXNOW_WIDGET_COUNTRIES`` (shared/utils/boxnow-widget.ts) has
// nothing to embed, distinct from "partnerId not configured" above.
const isBoxNowCountrySupported = computed(() =>
  !!boxNowWidgetCountry(formState.value.country))

// Mirrors the visibility decision in ``useCheckoutForm`` so the
// "BoxNow is unconfigured" alert below only renders when the
// shopper actually has BoxNow as a candidate method (otherwise
// it'd surface on every checkout in environments without BoxNow).
const boxnowAvailable = computed(() =>
  props.apiOptions.some(o => o.providerCode === 'boxnow'),
)

// Pay-way compatibility is NOT decided here, deliberately.
//
// The server already filters pay-ways per (carrier, kind) — a BoxNow
// locker offers PAY ON THE GO but never courier cash-on-delivery,
// because a locker has no POS and takes no cash
// (``BoxNowCarrier.supported_settlements``). ``useCheckoutForm``
// refetches ``/api/pay-way`` whenever ``shippingMethod`` changes and
// drops a selection the server no longer offers, so an incompatible
// combination cannot survive a method switch in either direction.
//
// A client-side gate here was tried and removed (``8fb8dcbc``): it
// keyed on "is this pay-way offline?", which is true of PAY ON THE GO
// as well, so it disabled the very product it was meant to enable.
// The distinction is a settlement, not a boolean — and it belongs on
// the server, which is the only place that knows what each carrier can
// physically collect.
//
// So the only thing that disables the row is a missing partner id or
// an unsupported delivery country.
const isBoxNowDisabled = computed(() =>
  !isBoxNowConfigured.value || !isBoxNowCountrySupported.value)

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
  /**
   * What this row costs, from the API option the checkout prices the
   * method with (``useCheckoutForm``'s ``matchedShippingOption``). 0 is
   * a real answer: it is "Free".
   */
  price: number
  /** Payment methods reachable ONLY by choosing this delivery row. */
  exclusivePayWays: string[]
  /** Why the row is disabled, shown inline next to the description. */
  disabledReason?: string
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
/**
 * The pay ways each RENDERED row can settle.
 *
 * Django answers per (provider, kind); this component collapses every
 * home-delivery carrier into one card, so the sets have to be folded
 * the same way. The fold is an INTERSECTION, not a union: picking
 * "delivery to your address" does not let the shopper pick the
 * carrier, so only a method every collapsed carrier accepts is
 * actually on offer — the same rule Django applies server-side when a
 * request names a kind but no provider.
 */
const payWayNamesByMethod = computed(() => {
  const byMethod = new Map<ShippingMethodKey, Set<string>>()
  for (const option of props.apiOptions) {
    const key = methodKeyForOption(option) as ShippingMethodKey | null
    if (!key) continue
    const names = new Set((option.payWays ?? []).map(p => p.name))
    const existing = byMethod.get(key)
    if (!existing) {
      byMethod.set(key, names)
      continue
    }
    for (const name of existing) {
      if (!names.has(name)) existing.delete(name)
    }
  }
  return byMethod
})

/**
 * Pay ways a row is the ONLY way to reach.
 *
 * BOX NOW Αντικαταβολή can only be settled at a BoxNow locker, and the
 * payment step comes AFTER this one — so a shopper who never picks a
 * locker has no way to discover the method exists. Naming it here puts
 * the information where the decision is made instead of leaving the
 * payment step to explain an absence.
 *
 * Computed against the rendered rows rather than asked of the server,
 * because only this component knows which rows it actually renders.
 */
const exclusivePayWaysByMethod = computed(() => {
  const result = new Map<ShippingMethodKey, string[]>()
  const all = payWayNamesByMethod.value
  for (const [key, names] of all) {
    const elsewhere = new Set<string>()
    for (const [otherKey, otherNames] of all) {
      if (otherKey === key) continue
      for (const name of otherNames) elsewhere.add(name)
    }
    result.set(key, [...names].filter(name => !elsewhere.has(name)))
  }
  return result
})

// A promotion's free shipping zeroes every method's cost (the sidebar
// does the same), so the cards say Free too rather than the carrier's
// own rate.
const promotionFreeShipping = computed(() => Boolean(cart.value?.promotionFreeShipping))

/**
 * The API option a row is priced by — the same pick ``useCheckoutForm``
 * makes for the selected method, so a card never states a price the
 * sidebar then contradicts. Home delivery collapses several carriers;
 * the server routes the cart to the first one it fits.
 */
function pricedOption(key: ShippingMethodKey, sameMethod: ShippingOption[], first: ShippingOption): ShippingOption {
  if (key === 'home_delivery') {
    return sameMethod.find(o => !o.exceedsMaxWeight) ?? first
  }
  return first
}

const shippingOptions = computed(() => {
  const seen = new Set<ShippingMethodKey>()
  const ordered: ShippingOptionItem[] = []
  for (const option of props.apiOptions) {
    const key = methodKeyForOption(option) as ShippingMethodKey | null
    if (!key || seen.has(key)) continue
    const baseItem = itemsByKey.value[key]
    if (!baseItem) continue
    seen.add(key)
    // Over-cap options stay VISIBLE (never hidden) — a heavy cart
    // must never silently lose a shipping step. They render disabled
    // with a reason instead.
    // One row can stand for several carriers (every home-delivery
    // carrier collapses into one card), so it is over the cap only
    // when EVERY carrier behind it is: the server routes a heavy cart
    // to a carrier that fits.
    const sameMethod = props.apiOptions.filter(
      o => methodKeyForOption(o) === key,
    )
    const overCap = sameMethod.every(o => o.exceedsMaxWeight)
    const boxNowCountryUnsupported = key === 'box_now_locker'
      && isBoxNowConfigured.value
      && !isBoxNowCountrySupported.value
    ordered.push({
      ...baseItem,
      logo: resolveShippingLogo(option.logoUrl),
      price: promotionFreeShipping.value
        ? 0
        : pricedOption(key, sameMethod, option).price,
      // Resolved through the same label map the payment step uses, so
      // the two never disagree on what a method is called.
      exclusivePayWays: (exclusivePayWaysByMethod.value.get(key) ?? [])
        .filter(name => name.length > 0)
        .map(name => getPaymentMethodName(name)),
      disabled: baseItem.disabled || overCap,
      disabledReason: overCap
        ? t('shipping.method.exceeds_max_weight', {
            maxWeight: n(Math.max(...sameMethod.map(o => o.maxWeightGrams ?? 0)) / 1000, 'weight'),
          })
        : boxNowCountryUnsupported
          ? t('shipping.method.boxnow.country_unsupported')
          : undefined,
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

const selectedOption = computed(() =>
  shippingOptions.value.find(item => item.value === formState.value.shippingMethod),
)

// Free for the method the shopper has chosen — Django answers 0 only
// when a rate's free-shipping threshold is met, and a promotion says so
// on the cart.
const freeDeliveryApplied = computed(() => selectedOption.value?.price === 0)

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
  // The step renders the retry prompt (not the form) while options
  // failed to load — nothing to validate or advance past yet. The
  // sidebar CTA proxies through this same ``submit()``, so this guard
  // is what stops IT from advancing too.
  if (props.optionsError) return
  // A method that is no longer offered, or whose row is disabled (over
  // every carrier's weight cap, a country BoxNow does not serve), must
  // not advance to payment on a stale selection.
  const selected = selectedOption.value
  if (!selected || selected.disabled) return
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
  free_delivery_title: Εφαρμόστηκε δωρεάν αποστολή
  free_delivery_description: Η παραγγελία σου δικαιούται δωρεάν αποστολή με αυτή τη μέθοδο.
en:
  back: Back
  retry: Try again
  free: Free
  free_delivery_title: Free delivery applied
  free_delivery_description: Your order qualifies for free delivery with this method.
</i18n>
