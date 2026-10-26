/**
 * The delivery step of checkout: one card per delivery method the store
 * serves, what each costs and when it arrives, which ones the cart cannot
 * take and why, the chosen carrier's locker picker, and the rule for
 * moving on to payment. Both drawings of the step (the default and the
 * frozen webside copy) render these; the step's own `submit()` is
 * `submit` here.
 */
export interface CheckoutShippingStepInputs {
  /** The checkout form (`useCheckoutForm`'s state), shared with the page. */
  formState: Ref<Record<string, any>>
  /**
   * Live, priority-sorted carrier options from ``/api/v1/shipping/options``
   * (already filtered by the backend to active ``ShippingProvider`` rows and
   * per-kind flags like ``ACS_SMARTPOINT_ENABLED``). The cards follow this
   * order: admins reorder the picker by editing the provider rows' priority.
   */
  apiOptions: MaybeRefOrGetter<ShippingOption[]>
  /** The tenant's BoxNow partner id; empty when BoxNow is not set up. */
  partnerId: MaybeRefOrGetter<string>
  /** The options fetch failed: the step shows a retry prompt, not the cards. */
  optionsError: MaybeRefOrGetter<boolean | undefined>
  /** The step's `UForm`, re-validated when a locker is picked. */
  form: Readonly<Ref<{
    validate: (opts?: { name?: string | string[], silent?: boolean }) => Promise<unknown>
  } | null>>
  /** Moves on to the payment step. */
  onNext: () => void
}

// Brand metadata (icon, optional badge tagline) lives in
// ``app/utils/shipping-methods.ts``. ``description`` is kept out of the item
// objects as ``descriptionText``: the cards render it in their own label
// slot, and URadioGroup would otherwise ALSO render it as a separate
// ``data-slot="description"`` paragraph.
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

export type ShippingOptionItem = ShippingOptionItemBase & {
  /** ``ShippingOption.logoPath`` (operator upload), else the bundled default. */
  logo: string
  /**
   * What this card costs, from the API option the checkout prices the
   * method with (``useCheckoutForm``'s ``matchedShippingOption``). 0 is a
   * real answer: it is "Free".
   */
  price: number
  /** Business days after dispatch, from the same option; null = none advertised. */
  estimate: { min: number, max: number } | null
  /** Payment methods reachable ONLY by choosing this card. */
  exclusivePayWays: string[]
  /** Why the card is disabled, shown inline next to the description. */
  disabledReason?: string
}

// Each carrier's locker fields, cleared when the shopper switches to a
// method that does not own them, so no orphan locker id reaches the order.
const PROVIDER_FORM_KEYS: Record<string, string[]> = {
  acs_smartpoint: [
    'acsStationExternalId',
    'acsStationBranch',
    'acsStation',
  ],
  box_now_locker: ['boxnowLockerId', 'boxnowLocker'],
}

/**
 * The API option a card is priced by — the same pick ``useCheckoutForm``
 * makes for the selected method, so a card never states a price the order
 * summary then contradicts. Home delivery collapses several carriers; the
 * server routes the cart to the first one it fits.
 */
function pricedOption(key: ShippingMethodKey, sameMethod: ShippingOption[], first: ShippingOption): ShippingOption {
  if (key === 'home_delivery') {
    return sameMethod.find(o => !o.exceedsMaxWeight) ?? first
  }
  return first
}

export function useCheckoutShippingStep(inputs: CheckoutShippingStepInputs) {
  const { formState } = inputs
  const { t, n } = useI18n()
  const { getPaymentMethodName } = usePaymentMethod()
  const { cart } = storeToRefs(useCartStore())

  const apiOptions = computed(() => toValue(inputs.apiOptions))

  // Without a partner id (the tenant has not set one; there is no platform
  // fallback) the BoxNow card is disabled, so the shopper never reaches a
  // picker that would throw "partnerId is required" from
  // buildBoxNowIframeUrl.
  const isBoxNowConfigured = computed(() => Boolean(toValue(inputs.partnerId)))

  // BoxNow has no country-agnostic widget host: a country outside
  // ``BOXNOW_WIDGET_COUNTRIES`` (shared/utils/boxnow-widget.ts) has nothing
  // to embed, distinct from "partnerId not configured" above.
  const isBoxNowCountrySupported = computed(() =>
    !!boxNowWidgetCountry(formState.value.country))

  // Whether BoxNow is a candidate at all, so the "BoxNow is unconfigured"
  // alert only shows where the store serves BoxNow.
  const boxnowAvailable = computed(() =>
    apiOptions.value.some(o => o.providerCode === 'boxnow'),
  )

  // Pay-way compatibility is NOT decided here, deliberately. The server
  // filters pay ways per (carrier, kind) — a BoxNow locker offers PAY ON THE
  // GO but never courier cash-on-delivery (``BoxNowCarrier.supported_settlements``)
  // — and ``useCheckoutForm`` refetches ``/api/pay-way`` on every method
  // change, dropping a selection the server no longer offers. A client-side
  // gate keyed on "is this pay way offline?" was tried and removed
  // (``8fb8dcbc``): it disabled PAY ON THE GO, the very product it was meant
  // to enable. So only a missing partner id or an unsupported delivery
  // country disables the card.
  const isBoxNowDisabled = computed(() =>
    !isBoxNowConfigured.value || !isBoxNowCountrySupported.value)

  function buildBrandMeta(method: ShippingMethodKey) {
    const meta = getShippingMethodMeta(method)
    return {
      altText: t(meta.altKey),
      icon: meta.icon,
      taglineKey: meta.taglineKey,
      taglineColor: meta.taglineColor,
    }
  }

  // Per-method labels and brand hints. Methods absent from ``apiOptions``
  // are left out below: Django decides which ones the store serves.
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

  /**
   * The pay ways each RENDERED card can settle.
   *
   * Django answers per (provider, kind); every home-delivery carrier
   * collapses into one card, so the sets fold the same way. The fold is an
   * INTERSECTION, not a union: picking "delivery to your address" does not
   * let the shopper pick the carrier, so only a method every collapsed
   * carrier accepts is on offer — the rule Django applies server-side when a
   * request names a kind but no provider.
   */
  const payWayNamesByMethod = computed(() => {
    const byMethod = new Map<ShippingMethodKey, Set<string>>()
    for (const option of apiOptions.value) {
      const key = methodKeyForOption(option) as ShippingMethodKey | null
      if (!key) continue
      const names = new Set((option.payWays ?? []).map(p => p.key))
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
   * Pay ways a card is the ONLY way to reach.
   *
   * BOX NOW Αντικαταβολή can only be settled at a BoxNow locker, and the
   * payment step comes AFTER this one — so a shopper who never picks a
   * locker has no way to discover it exists. Naming it on the card puts
   * the information where the decision is made.
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

  // A promotion's free shipping zeroes every method's cost (the order
  // summary does the same), so the cards say Free too.
  const promotionFreeShipping = computed(() => Boolean(cart.value?.promotionFreeShipping))

  // One card per method, in the priority order Django sent; the first
  // option of a method gives the card its identity and its logo.
  const shippingOptions = computed(() => {
    const seen = new Set<ShippingMethodKey>()
    const ordered: ShippingOptionItem[] = []
    for (const option of apiOptions.value) {
      const key = methodKeyForOption(option) as ShippingMethodKey | null
      if (!key || seen.has(key)) continue
      const baseItem = itemsByKey.value[key]
      if (!baseItem) continue
      seen.add(key)
      // Over-cap cards stay VISIBLE, disabled with a reason: a heavy cart
      // must never silently lose its delivery step. A card standing for
      // several carriers is over the cap only when EVERY carrier behind it
      // is, since the server routes a heavy cart to one that fits.
      const sameMethod = apiOptions.value.filter(
        o => methodKeyForOption(o) === key,
      )
      const priced = pricedOption(key, sameMethod, option)
      const overCap = sameMethod.every(o => o.exceedsMaxWeight)
      // The same rule for the parcels: too large only when no carrier
      // behind the card fits the cart, and not for its weight alone.
      const tooLarge = !overCap && !sameMethod.some(optionFitsCart)
      const boxNowCountryUnsupported = key === 'box_now_locker'
        && isBoxNowConfigured.value
        && !isBoxNowCountrySupported.value
      ordered.push({
        ...baseItem,
        logo: resolveShippingLogo(option.logoPath),
        price: promotionFreeShipping.value ? 0 : priced.price,
        estimate: deliveryEstimate(priced),
        // Named through the label map the payment step uses, so the two
        // never disagree on what a method is called.
        exclusivePayWays: (exclusivePayWaysByMethod.value.get(key) ?? [])
          .filter(name => name.length > 0)
          .map(name => getPaymentMethodName(name)),
        disabled: baseItem.disabled || overCap || tooLarge,
        disabledReason: overCap
          ? t('shipping.method.exceeds_max_weight', {
              maxWeight: n(Math.max(...sameMethod.map(o => o.maxWeightGrams ?? 0)) / 1000, 'weight'),
            })
          : tooLarge
            ? t('shipping.method.exceeds_parcel_size')
            : boxNowCountryUnsupported
              ? t('shipping.method.boxnow.country_unsupported')
              : undefined,
      })
    }
    return ordered
  })

  // The chosen method's carrier (``null`` for home delivery, which has no
  // picker). The dispatch lives in the carrier registry.
  const activeCarrier = computed(() =>
    carrierForMethod(formState.value.shippingMethod),
  )

  const selectedOption = computed(() =>
    shippingOptions.value.find(item => item.value === formState.value.shippingMethod),
  )

  // Free for the chosen method: Django answers 0 only when a rate's
  // free-shipping threshold is met, and a promotion says so on the cart.
  const freeDeliveryApplied = computed(() => selectedOption.value?.price === 0)

  const isBoxNow = computed(
    () => formState.value.shippingMethod === 'box_now_locker',
  )

  // The active carrier's picker modal. Only one carrier's picker renders at
  // a time, so one flag serves them all, and `submit` can open it when no
  // locker is picked yet.
  const pickerOpen = ref(false)

  const isLockerMissing = computed(() => {
    const carrier = activeCarrier.value
    if (!carrier) return false
    return carrier.readLockerId(formState.value) === null
  })

  // UForm re-validates only on native input/change/blur events; picking a
  // locker in the modal fires none, so the stale "pick a locker" error
  // would stick although the schema is now satisfied. Validate the locker
  // field after every selection.
  watch(
    () => activeCarrier.value?.readLockerId(formState.value),
    async (lockerId) => {
      const form = inputs.form.value
      if (!lockerId || !activeCarrier.value || !form) return
      try {
        await form.validate({
          name: activeCarrier.value.formFieldName,
          silent: true,
        })
      }
      catch {
        // ``silent: true`` already swallows the field errors; this guards
        // an unexpected throw, so a selection never crashes the step.
      }
    },
  )

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

  function submit() {
    // The step shows the retry prompt (not the form) while the options
    // failed to load: nothing to validate or advance past yet.
    if (toValue(inputs.optionsError)) return
    // A method that is no longer offered, or whose card is disabled (over
    // every carrier's weight cap, a country BoxNow does not serve), must
    // not advance to payment on a stale selection.
    const selected = selectedOption.value
    if (!selected || selected.disabled) return
    // No locker picked yet: open the picker instead of failing silently.
    // A disabled Continue gave no signal about what was missing — a real
    // customer (order 53, 2026-05-12) bounced to ACS after staring at a
    // disabled BoxNow Continue button for ~50 minutes.
    if (isLockerMissing.value) {
      pickerOpen.value = true
      return
    }
    inputs.onNext()
  }

  return {
    isBoxNowConfigured,
    boxnowAvailable,
    shippingOptions,
    activeCarrier,
    freeDeliveryApplied,
    isBoxNow,
    pickerOpen,
    submit,
  }
}
