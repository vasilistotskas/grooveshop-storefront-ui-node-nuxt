/**
 * The delivery step of checkout: one card per delivery method the store
 * serves, what each costs and when it arrives, which ones the cart cannot
 * take and why, the chosen carrier's locker picker, and the rule for
 * moving on to payment. Both drawings of the step (the default and the
 * webside copy) render these; the step's own `submit()` is
 * `submit` here, and the step's form moves on once it validates (its
 * `@submit`): the method, the point or a home delivery's address, and
 * the receipt or invoice.
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
  /**
   * The checkout quote's `shippingOptions`: each delivery at the price
   * this cart would be charged for it (a free-shipping threshold or
   * promotion already applied, `waivedBy` saying which). The ONLY source
   * of a card's price; `null` until the quote has an answer.
   */
  quotedOptions: MaybeRefOrGetter<readonly QuoteShippingOption[] | null | undefined>
  /**
   * A new quote is on its way (`useCheckoutSubmit`'s `quotePending`): the
   * last one is still shown, but its locker size may be the old cart's.
   */
  quotePending: MaybeRefOrGetter<boolean | undefined>
  /** The options fetch failed: the step shows a retry prompt, not the cards. */
  optionsError: MaybeRefOrGetter<boolean | undefined>
  /**
   * The step's `UForm`: re-validated when a locker is picked, and
   * submitted to move on (its `@submit` emits the step's `next`).
   */
  form: Readonly<Ref<{
    submit: () => Promise<void>
    validate: (opts?: { name?: string | string[], silent?: boolean }) => Promise<unknown>
  } | null>>
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
}

export type ShippingOptionItem = ShippingOptionItemBase & {
  /** ``ShippingOption.logoPath`` (operator upload), else the bundled default. */
  logo: string
  /**
   * What this card costs, from the quote's row for the carrier the card
   * stands for. 0 is a real answer: it is "Free". ``null`` while the
   * quote has no row for it (not answered yet, or refused).
   */
  price: number | null
  /** Business days after dispatch, from the same option; null = none advertised. */
  estimate: { min: number, max: number } | null
  /** Payment methods reachable ONLY by choosing this card. */
  exclusivePayWays: string[]
  /** The cart is over the method's weight cap or too large for its parcels. */
  disabled: boolean
  /** Why the card is disabled, shown inline next to the description. */
  disabledReason?: string
}

export function useCheckoutShippingStep(inputs: CheckoutShippingStepInputs) {
  const { formState } = inputs
  const { t, n } = useI18n({ useScope: 'global' })
  const { getPaymentMethodName } = usePaymentMethod()

  const apiOptions = computed(() => toValue(inputs.apiOptions))

  /** The quote's price for a carrier's delivery, `null` without a row for it. */
  function quotedPrice(option: ShippingOption): number | null {
    const row = toValue(inputs.quotedOptions)?.find(quoted =>
      quoted.providerCode === option.providerCode && quoted.kind === option.kind)
    return row ? row.price : null
  }

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
      // The carrier the order would be placed with (``methodCarrier``,
      // Django's rule): it alone prices the card, decides whether it can
      // be picked, and is what submit checks (``refetchShippingOptions``).
      // It is over the weight cap only when every carrier behind the card
      // is; too large when its parcels cannot take the cart, whatever a
      // later carrier could carry, because Django would refuse the order.
      const priced = methodCarrier(sameMethod, key) ?? option
      const overCap = Boolean(priced.exceedsMaxWeight)
      const tooLarge = !overCap && !optionFitsCart(priced)
      ordered.push({
        ...baseItem,
        logo: resolveShippingLogo(option.logoPath),
        price: quotedPrice(priced),
        estimate: deliveryEstimate(priced),
        // Named through the label map the payment step uses, so the two
        // never disagree on what a method is called.
        exclusivePayWays: (exclusivePayWaysByMethod.value.get(key) ?? [])
          .filter(name => name.length > 0)
          .map(name => getPaymentMethodName(name)),
        disabled: overCap || tooLarge,
        disabledReason: overCap
          ? t('shipping.method.exceeds_max_weight', {
              maxWeight: n(Math.max(...sameMethod.map(o => o.maxWeightGrams ?? 0)) / 1000, 'weight'),
            })
          : tooLarge
            ? t('shipping.method.exceeds_parcel_size')
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

  // The quote's row for the chosen carrier's pickup: the compartment size
  // the cart packs into (BOX NOW's lockers are listed by it).
  const quotedPickup = computed(() => {
    const carrier = activeCarrier.value
    if (!carrier) return null
    return toValue(inputs.quotedOptions)?.find(quoted =>
      quoted.providerCode === carrier.code && quoted.kind === 'pickup_point') ?? null
  })
  // Until the quote has a row for that pickup, and while a new quote is on
  // its way (the last one may name the old cart's size), the picker waits.
  const lockerSizePending = computed(() =>
    Boolean(toValue(inputs.quotePending)) || quotedPickup.value === null)
  // The size, `null` when the row names none: a store on BOX NOW's stage
  // network has no sizes, and every locker is listed.
  const lockerCompartmentSize = computed(() =>
    lockerSizePending.value ? null : quotedPickup.value?.compartmentSize ?? null)

  const selectedOption = computed(() =>
    shippingOptions.value.find(item => item.value === formState.value.shippingMethod),
  )

  // Free for the chosen method: the quote prices it 0 only when a rate's
  // free-shipping threshold is met or a promotion waives it.
  const freeDeliveryApplied = computed(() => selectedOption.value?.price === 0)

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
      // A method's pickup point is cleared when the shopper switches to
      // a method that does not own it, so no orphan id reaches the order.
      for (const owningMethod of Object.keys(PICKUP_FORM_KEYS)) {
        if (method !== owningMethod) clearPickupPoint(formState.value, owningMethod)
      }
    },
  )

  async function submit() {
    // The step shows the retry prompt (not the form) while the options
    // failed to load: nothing to validate or advance past yet.
    if (toValue(inputs.optionsError)) return
    // A method that is no longer offered, or whose card is disabled (over
    // every carrier's weight cap, or the cart too large for its parcels),
    // must not advance to payment on a stale selection.
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
    // The rest of the step: a home delivery's address, the invoice.
    await inputs.form.value?.submit()
  }

  return {
    shippingOptions,
    activeCarrier,
    lockerCompartmentSize,
    lockerSizePending,
    freeDeliveryApplied,
    pickerOpen,
    submit,
  }
}
