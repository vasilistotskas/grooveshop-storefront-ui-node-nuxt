import * as z from 'zod'

export async function useCheckoutForm() {
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)
  const n = $i18n.n.bind($i18n)
  const locale = computed(() => $i18n.locale.value)
  const toast = useToast()
  const { getPaymentMethodName } = usePaymentMethod()

  const cartStore = useCartStore()
  const { getCartItems, cart } = storeToRefs(cartStore)
  const { loggedIn, user } = useUserSession()

  // Form state
  const formState = reactive({
    // Personal Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    // Address
    country: '',
    countryId: undefined as string | undefined,
    region: '',
    regionId: undefined as string | undefined,
    city: '',
    place: '',
    zipcode: '',
    street: '',
    streetNumber: '',
    customerNotes: '',
    // Shipping method (Step 1 — new)
    shippingMethod: 'home_delivery' as ShippingMethodEnum,
    boxnowLockerId: '' as string,
    boxnowLocker: null as BoxNowSelectedLocker | null,
    boxnowCompartmentSize: 1 as 1 | 2 | 3,
    // ACS Smartpoint locker pickup (Phase 2). Picker UI is server-side
    // — we hold both the externalId and the AcsStation row so the
    // selected-locker card can render without a follow-up fetch.
    acsStationExternalId: '' as string,
    acsStationBranch: '' as string,
    acsStation: null as AcsStation | null,
    // Payment
    payWay: undefined as number | undefined,
    payWayId: undefined as number | undefined,
    documentType: zOrderCreateDocumentType.enum.RECEIPT,
    // B2B billing identity — only required when documentType=INVOICE.
    // Normalised server-side (strip EL/GR, uppercase country) but we
    // keep the raw value here and surface the validation error inline
    // via ``superRefine`` on step1Schema.
    billingVatId: '',
    billingCountry: '',
    items: [] as { product: number, quantity: number }[],
    // Optional "save this delivery address to my address book" toggle —
    // only reachable in the ``new address`` flow for logged-in users.
    // ``saveAddress`` false ⇒ ``addressTitle`` is irrelevant; true ⇒
    // ``addressTitle`` must be non-empty (enforced via superRefine on
    // step1Schema).
    saveAddress: false,
    addressTitle: '',
  })

  // Sync cart items with form state
  watch(getCartItems, (cartItems) => {
    formState.items = cartItems.map(item => ({
      product: item.product.id,
      quantity: item.quantity ?? 1,
    }))
  }, { immediate: true })

  const regions = ref<Pagination<Region> | null>(null)
  const selectedPayWay = useState<PayWay | null>('selectedPayWay', () => null)

  // Declare refs for fetched data (populated after await)
  const shippingSetting = ref<{ value: string } | null>(null)
  const freeShippingThresholdSetting = ref<{ value: string } | null>(null)
  const boxnowShippingSetting = ref<{ value: string } | null>(null)
  const boxnowFreeShippingThresholdSetting = ref<{ value: string } | null>(null)
  const boxnowEnabled = ref(false)
  // Per-kind toggle for ACS Smartpoint pickup. Backend returns the
  // ACS_SMARTPOINT_ENABLED Setting value as a string ("True"/"False");
  // the StepShipping component coerces to boolean before gating the
  // radio row.
  const acsSmartpointEnabled = ref(false)
  const acsShippingSetting = ref<{ value: string } | null>(null)
  const acsFreeShippingThresholdSetting = ref<{ value: string } | null>(null)
  const b2bInvoicingEnabled = ref(true)
  const countries = ref<Pagination<Country> | null>(null)
  const payWays = ref<Pagination<PayWay> | null>(null)

  // Functions
  const fetchRegions = async () => {
    try {
      const countryValue = formState.country
      regions.value = await $fetch<ListRegionResponse>('/api/regions', {
        method: 'GET',
        query: {
          country: countryValue || undefined,
          languageCode: locale.value,
        },
      })
    }
    catch {
      toast.add({
        title: t('error.default'),
        description: t('error_occurred'),
        color: 'error',
      })
    }
  }

  // No exported ``onCountryChange`` — the ``watch(() => formState
  // .country, ...)`` above handles all cascade paths (direct user
  // click, saved-address prefill, programmatic reset, first-render
  // fallback). Single source of truth, no event-chain timing
  // ambiguity.

  // Saved addresses exposed to the Step 1 component so users with
  // multiple saved addresses can pick one without re-typing. Only
  // populated for authenticated users — the server route rejects guests.
  const savedAddresses = ref<UserAddressDetail[]>([])
  const selectedSavedAddressId = ref<number | null>(null)

  // "saved" = a saved address card is selected → hide personal/address
  //            form sections (they'd just duplicate what's on the card);
  // "new"   = user wants to enter a fresh address → show the full form.
  // Guests and logged-in users without saved addresses start in 'new'.
  const addressEntryMode = ref<'saved' | 'new'>('new')

  /**
   * Apply a saved UserAddress to the checkout form state. Shared between
   * the "prefill main on mount" and "user picks an address from the
   * dropdown" code paths so the mapping stays consistent. Email comes
   * from the session (addresses don't carry one).
   */
  const applyAddressToFormState = (address: UserAddressDetail) => {
    formState.firstName = address.firstName || formState.firstName
    formState.lastName = address.lastName || formState.lastName
    formState.phone = address.phone || formState.phone
    formState.street = address.street || formState.street
    formState.streetNumber = address.streetNumber || formState.streetNumber
    formState.city = address.city || formState.city
    formState.zipcode = address.zipcode || formState.zipcode
    formState.country = address.country || formState.country
    formState.countryId = address.country || formState.countryId
    formState.region = address.region || formState.region
    formState.regionId = address.region || formState.regionId
    if (user.value?.email && !formState.email) {
      formState.email = user.value.email
    }
  }

  /**
   * User-invoked address picker: set the selected address id, hydrate
   * the form from its values, and flip the form into "saved" mode so
   * the personal-info + address sections collapse into the card summary.
   */
  const selectSavedAddress = async (addressId: number | null) => {
    selectedSavedAddressId.value = addressId
    if (addressId === null) {
      addressEntryMode.value = 'new'
      return
    }
    const address = savedAddresses.value.find(a => a.id === addressId)
    if (!address) return
    applyAddressToFormState(address)
    addressEntryMode.value = 'saved'
    await fetchRegions()
  }

  /**
   * Explicit opt-out of the saved-address picker — e.g. the user clicks
   * the "Νέα διεύθυνση" card. Resets every address-derived field so
   * the newly-revealed form isn't pre-populated with the previously
   * selected address's values (that would be confusing — the shopper
   * opted into "new address" specifically to type something fresh).
   *
   * ``email`` stays because it's tied to the account/session; the
   * order-level extras (``customerNotes``, ``saveAddress``,
   * ``addressTitle``) keep whatever the user has set for this checkout.
   */
  const useNewAddress = async () => {
    selectedSavedAddressId.value = null
    addressEntryMode.value = 'new'

    formState.firstName = ''
    formState.lastName = ''
    formState.phone = ''
    formState.street = ''
    formState.streetNumber = ''
    formState.city = ''
    formState.place = ''
    formState.zipcode = ''
    formState.region = ''
    formState.regionId = undefined

    // Reset the country to the first listed option so the region
    // dropdown still has something to populate against — matches the
    // fresh-guest default rather than leaving the form in a half-state.
    const fallbackCountry = countries.value?.results?.[0]
    if (fallbackCountry) {
      formState.country = fallbackCountry.alpha2
      formState.countryId = fallbackCountry.alpha2
      await fetchRegions()
    }
    else {
      formState.country = ''
      formState.countryId = undefined
    }
  }

  // Register all watchers/lifecycle hooks BEFORE await (Vue context requirement)

  // Cascade: when ``formState.country`` changes, refresh the region
  // dropdown options. Watcher (not emit chain) so the cascade fires
  // for any change path: direct user click on the country select,
  // saved-address prefill, programmatic reset, the
  // first-render fallback that picks ``countries[0]``. The previous
  // ``@update:model-value="emit('country-change')"`` only fired on
  // direct user interaction, leaving the region dropdown stale on
  // reset/prefill paths.
  //
  // ``immediate: false`` because the bottom-of-setup block already
  // hydrates regions for the initial country once. ``flush: 'post'``
  // so we observe the value AFTER v-model has committed it — guards
  // against timing differences across Reka-ui select implementations.
  watch(
    () => formState.country,
    async (newCountry, oldCountry) => {
      if (newCountry === oldCountry) return
      formState.region = ''
      formState.regionId = undefined
      if (newCountry && countries.value?.results) {
        const selectedCountry = countries.value.results.find(
          c => c.alpha2 === newCountry,
        )
        if (selectedCountry) {
          formState.countryId = selectedCountry.alpha2
        }
      }
      await fetchRegions()
    },
    { flush: 'post' },
  )

  watch(() => formState.payWay, (newPayWayId) => {
    if (newPayWayId && payWays.value?.results) {
      const payWay = payWays.value.results.find(pw => pw.id === newPayWayId)
      if (payWay) {
        selectedPayWay.value = payWay
        formState.payWayId = payWay.id
      }
    }
  })

  // Re-fetch pay ways whenever the shopper picks a different shipping
  // method. Django's PayWayFilter strips ``is_online_payment=False``
  // pay ways when ``?shipping_method=box_now_locker`` is supplied
  // (BoxNow lockers don't accept cash-on-delivery — no POS at lockers).
  // The Nuxt server route's cache key already includes the query so
  // each shipping method gets its own cached list — we just need to
  // ask for the right one.
  watch(() => formState.shippingMethod, async (newMethod) => {
    try {
      const fresh = await $fetch<Pagination<PayWay>>('/api/pay-way', {
        method: 'GET',
        query: {
          languageCode: locale.value,
          shippingMethod: newMethod,
        },
        headers: useRequestHeaders(),
      })
      payWays.value = fresh
      // If the previously selected pay way is no longer in the list
      // (e.g. user picked BoxNow and their COD selection was filtered
      // out), reset to the first valid option so step 3 doesn't render
      // with a stale/disabled selection.
      const stillValid = fresh.results?.some(
        pw => pw.id === formState.payWayId,
      )
      if (!stillValid && fresh.results?.[0]) {
        formState.payWay = fresh.results[0].id
        formState.payWayId = fresh.results[0].id
        selectedPayWay.value = fresh.results[0]
      }
    }
    catch (error) {
      log.warn('checkout', 'pay-way refetch failed', { error })
    }
  })

  watch(() => formState.region, (newRegionAlpha) => {
    // Only clear ``regionId`` when the shopper explicitly empties the
    // region — NOT when regions haven't loaded yet. The previous
    // guard (``newRegionAlpha && regions.value?.results``) fell through
    // to the ``else`` branch during SSR, clobbering the regionId that
    // ``applyAddressToFormState`` had just set when restoring a saved
    // address. The result: order payload shipped without ``regionId``
    // so Django stored the order with ``region = null``, and Zod
    // rejected the response.
    if (!newRegionAlpha) {
      formState.regionId = undefined
      return
    }
    // Mirror the alpha into regionId. If regions are loaded we still
    // look up the canonical entry (defensive against typos), otherwise
    // we trust the value we just mirrored — it's a region alpha code
    // either way.
    const matched = regions.value?.results?.find(r => r.alpha === newRegionAlpha)
    formState.regionId = matched?.alpha ?? newRegionAlpha
  })

  // Computed properties (also before await).
  // Shipping cost switches on the selected method. All four settings
  // live in `extra_settings.Setting` on Django and are exposed via
  // `/api/settings/get`. The free-shipping threshold zeroes the price
  // once the cart total reaches it.
  const shippingPrice = computed(() => {
    const cartTotal = cart.value?.totalPrice || 0
    const method = formState.shippingMethod

    let priceSetting: typeof shippingSetting
    let thresholdSetting: typeof freeShippingThresholdSetting

    if (method === 'box_now_locker') {
      priceSetting = boxnowShippingSetting
      thresholdSetting = boxnowFreeShippingThresholdSetting
    }
    else if (method === 'acs_smartpoint') {
      priceSetting = acsShippingSetting
      thresholdSetting = acsFreeShippingThresholdSetting
    }
    else {
      priceSetting = shippingSetting
      thresholdSetting = freeShippingThresholdSetting
    }

    if (!priceSetting.value) return 0
    const baseShippingCost = parseFloat(priceSetting.value.value)
    const freeShippingThreshold = thresholdSetting.value
      ? parseFloat(thresholdSetting.value.value)
      : Number.POSITIVE_INFINITY

    return cartTotal >= freeShippingThreshold ? 0 : baseShippingCost
  })

  const countryOptions = computed(() => {
    return countries.value?.results?.map(country => ({
      label: extractTranslated(country, 'name', locale.value) ?? country.alpha2,
      value: country.alpha2,
    })) || []
  })

  const regionOptions = computed(() => {
    return regions.value?.results?.map(region => ({
      label: extractTranslated(region, 'name', locale.value) ?? region.alpha,
      value: region.alpha,
    })) || []
  })

  const payWayOptions = computed(() => {
    return payWays.value?.results?.map((payWay) => {
      let name = extractTranslated(payWay, 'name', locale.value)

      if (name) {
        name = getPaymentMethodName(name)
      }

      const cartTotal = cart.value?.totalPrice || 0
      const threshold = payWay.freeThreshold || 0
      const displayCost = (threshold > 0 && cartTotal >= threshold) ? 0 : payWay.cost

      return {
        label: `${name} (+${n(displayCost, 'currency')})`,
        value: payWay.id,
        mainImagePath: payWay.mainImagePath,
      }
    }) || []
  })

  // Validation schemas
  const step1Schema = z.object({
    firstName: z.string({ error: t('validation.required') }).min(3, {
      error: t('validation.first_name.min', { min: 3 }),
    }),
    lastName: z.string({ error: t('validation.required') }).min(3, {
      error: t('validation.last_name.min', { min: 3 }),
    }),
    email: z.email({ error: t('validation.email.valid') }),
    phone: z.string({ error: t('validation.required') }).min(3, {
      error: t('validation.phone.min', { min: 3 }),
    }),
    country: z.string({ error: t('validation.required') }).min(1, {
      error: t('validation.required'),
    }),
    region: z.string({ error: t('validation.required') }).min(1, {
      error: t('validation.required'),
    }),
    city: z.string({ error: t('validation.required') }).min(3, {
      error: t('validation.city.min', { min: 3 }),
    }),
    // `place` (neighborhood / area) is optional: UserAddress doesn't
    // carry it, so forcing it here would reject valid saved addresses.
    // When the user types it in the form we still validate the minimum
    // length; empty or absent values pass through as "" (matches the
    // Django Order.place ``blank=True, default=""`` column).
    place: z.string().min(3, { error: t('validation.place.min', { min: 3 }) }).or(z.literal('')).optional(),
    zipcode: z.string({ error: t('validation.required') }).min(3, {
      error: t('validation.zipcode.min', { min: 3 }),
    }),
    street: z.string({ error: t('validation.required') }).min(3, {
      error: t('validation.street.min', { min: 3 }),
    }),
    streetNumber: z.string({ error: t('validation.required') }).min(1, {
      error: t('validation.street_number.min', { min: 1 }),
    }),
    customerNotes: z.string().optional(),
    saveAddress: z.boolean().optional(),
    // Optional label ("Home" / "Office" etc.) — only meaningful when
    // saveAddress is true. The pairing requirement is enforced in
    // ``superRefine`` below so users can leave the field blank otherwise.
    addressTitle: z.string().max(255).optional(),
    // Document type drives the myDATA submission downstream: RECEIPT
    // → 11.1 retail, INVOICE → 1.1 B2B (requires buyer VAT).
    documentType: zOrderCreateDocumentType.optional(),
    billingVatId: z.string().max(12).optional(),
    billingCountry: z.string().max(2).optional(),
  }).superRefine((data, ctx) => {
    if (data.saveAddress && !(data.addressTitle ?? '').trim()) {
      ctx.addIssue({
        path: ['addressTitle'],
        code: z.ZodIssueCode.custom,
        message: t('validation.required'),
      })
    }
    // Buyer asked for a proper invoice — require a valid Greek ΑΦΜ.
    // Mirror the Django-side normalisation (strip EL/GR, 9 digits) so
    // the user gets an inline error before we hit the API. Django
    // re-validates because the form isn't the only entry point.
    if (data.documentType === zOrderCreateDocumentType.enum.INVOICE) {
      const rawVat = (data.billingVatId ?? '').trim().toUpperCase()
      const cleaned = rawVat.replace(/^(EL|GR)/, '').trim()
      if (!/^\d{9}$/.test(cleaned)) {
        ctx.addIssue({
          path: ['billingVatId'],
          code: z.ZodIssueCode.custom,
          message: t('validation.billing_vat.invalid'),
        })
      }
    }
  })

  const step2Schema = z.object({
    shippingMethod: z.enum(['home_delivery', 'box_now_locker', 'acs_smartpoint']),
    boxnowLockerId: z.string().optional(),
    boxnowCompartmentSize: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    acsStationExternalId: z.string().optional(),
  }).superRefine((data, ctx) => {
    if (data.shippingMethod === 'box_now_locker' && !data.boxnowLockerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['boxnowLockerId'],
        message: t('shipping.boxnow.required_error'),
      })
    }
    if (data.shippingMethod === 'acs_smartpoint' && !data.acsStationExternalId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['acsStationExternalId'],
        message: t('shipping.acs.required_error'),
      })
    }
  })

  const step3Schema = z.object({
    payWay: z.number({ error: t('validation.payment_method.required') }).min(1, {
      error: t('validation.payment_method.required'),
    }),
  })

  // Fetch all checkout data in parallel. Every fetch here runs during
  // SSR via ``useAsyncData`` so the payload reaches the client with the
  // form state already populated — the previous ``onMounted`` approach
  // meant the server rendered the guest UI and the client then flipped
  // to the picker on hydration, causing a visible ~1s flash.
  const [
    shippingResult,
    freeShippingResult,
    boxnowShippingResult,
    boxnowFreeShippingResult,
    boxnowEnabledResult,
    acsSmartpointEnabledResult,
    acsShippingResult,
    acsFreeShippingResult,
    b2bInvoicingResult,
    countriesResult,
    payWaysResult,
    mainAddressResult,
    savedAddressesResult,
  ] = await Promise.all([
    useAsyncData<{ value: string } | null>(
      'checkout:shipping-price-setting',
      () => $fetch<{ value: string }>('/api/settings/get', {
        method: 'GET',
        query: { key: 'CHECKOUT_SHIPPING_PRICE' },
        headers: useRequestHeaders(),
      }).catch(() => null),
    ),
    useAsyncData<{ value: string } | null>(
      'checkout:free-shipping-threshold-setting',
      () => $fetch<{ value: string }>('/api/settings/get', {
        method: 'GET',
        query: { key: 'FREE_SHIPPING_THRESHOLD' },
        headers: useRequestHeaders(),
      }).catch(() => null),
    ),
    useAsyncData<{ value: string } | null>(
      'checkout:boxnow-shipping-price-setting',
      () => $fetch<{ value: string }>('/api/settings/get', {
        method: 'GET',
        query: { key: 'BOXNOW_SHIPPING_PRICE' },
        headers: useRequestHeaders(),
      }).catch(() => null),
    ),
    useAsyncData<{ value: string } | null>(
      'checkout:boxnow-free-shipping-threshold-setting',
      () => $fetch<{ value: string }>('/api/settings/get', {
        method: 'GET',
        query: { key: 'BOXNOW_FREE_SHIPPING_THRESHOLD' },
        headers: useRequestHeaders(),
      }).catch(() => null),
    ),
    useAsyncData<{ value: string } | null>(
      'checkout:boxnow-enabled',
      () => $fetch<{ value: string }>('/api/settings/get', {
        method: 'GET',
        query: { key: 'BOXNOW_ENABLED' },
        headers: useRequestHeaders(),
      }).catch(() => null),
    ),
    useAsyncData<{ value: string } | null>(
      'checkout:acs-smartpoint-enabled',
      () => $fetch<{ value: string }>('/api/settings/get', {
        method: 'GET',
        query: { key: 'ACS_SMARTPOINT_ENABLED' },
        headers: useRequestHeaders(),
      }).catch(() => null),
    ),
    useAsyncData<{ value: string } | null>(
      'checkout:acs-shipping-price-setting',
      () => $fetch<{ value: string }>('/api/settings/get', {
        method: 'GET',
        query: { key: 'ACS_SHIPPING_PRICE' },
        headers: useRequestHeaders(),
      }).catch(() => null),
    ),
    useAsyncData<{ value: string } | null>(
      'checkout:acs-free-shipping-threshold-setting',
      () => $fetch<{ value: string }>('/api/settings/get', {
        method: 'GET',
        query: { key: 'ACS_FREE_SHIPPING_THRESHOLD' },
        headers: useRequestHeaders(),
      }).catch(() => null),
    ),
    useAsyncData<{ value: string } | null>(
      'checkout:b2b-invoicing-enabled',
      () => $fetch<{ value: string }>('/api/settings/get', {
        method: 'GET',
        query: { key: 'B2B_INVOICING_ENABLED' },
        headers: useRequestHeaders(),
      }).catch(() => null),
    ),
    useAsyncData<Pagination<Country> | null>(
      () => `checkout:countries:${locale.value}`,
      () => $fetch<Pagination<Country>>('/api/countries', {
        method: 'GET',
        query: { languageCode: locale.value },
        headers: useRequestHeaders(),
      }).catch(() => null),
    ),
    useAsyncData<Pagination<PayWay> | null>(
      () => `checkout:pay-ways:${locale.value}:${formState.shippingMethod}`,
      () => $fetch<Pagination<PayWay>>('/api/pay-way', {
        method: 'GET',
        query: {
          languageCode: locale.value,
          shippingMethod: formState.shippingMethod,
        },
        headers: useRequestHeaders(),
      }).catch(() => null),
    ),
    useAsyncData<UserAddressDetail | null>(
      'checkout:main-address',
      async () => {
        if (!loggedIn.value) return null
        try {
          return await $fetch<UserAddressDetail>('/api/user/main-address', {
            method: 'GET',
            headers: useRequestHeaders(),
          })
        }
        catch (error) {
          // 404 = no main address yet, not worth logging.
          const status = (error as { statusCode?: number })?.statusCode
          if (status && status !== 404) {
            log.warn('checkout', 'main address fetch failed', { error })
          }
          return null
        }
      },
    ),
    useAsyncData<UserAddressDetail[]>(
      'checkout:saved-addresses',
      async () => {
        if (!loggedIn.value) return []
        try {
          const response = await $fetch<Pagination<UserAddressDetail>>(
            '/api/user/addresses',
            {
              method: 'GET',
              headers: useRequestHeaders(),
              // camelCase ordering keys — DRF filter splits on commas.
              // ``-isMain`` pins the default at the top, ``-createdAt``
              // breaks ties most-recent-first.
              query: { pageSize: 50, ordering: '-isMain,-createdAt' },
            },
          )
          return response.results ?? []
        }
        catch (error) {
          log.warn('checkout', 'saved addresses fetch failed', { error })
          return []
        }
      },
    ),
  ])

  // Populate reactive refs with fetched data. ``useAsyncData`` types
  // ``data.value`` as ``T | null | undefined``; we already awaited so
  // ``undefined`` is impossible at runtime — the ``?? null`` collapses
  // the type back to what the refs expect.
  shippingSetting.value = shippingResult.data.value ?? null
  freeShippingThresholdSetting.value = freeShippingResult.data.value ?? null
  boxnowShippingSetting.value = boxnowShippingResult.data.value ?? null
  boxnowFreeShippingThresholdSetting.value = boxnowFreeShippingResult.data.value ?? null
  // extra_settings serialises booleans as the strings "True"/"False".
  // BoxNow defaults to **disabled** — the master switch starts False
  // in production so a fresh deploy doesn't expose the option until an
  // admin (and BoxNow's partner activation) confirm. Stage/dev flips
  // it on in Django admin once the account is activated.
  boxnowEnabled.value = boxnowEnabledResult.data.value?.value === 'True'
  // ACS Smartpoint defaults disabled (Phase 2 progressive rollout):
  // ops flips the Setting to True after the AcsStation cache has been
  // synced and the picker is verified end-to-end.
  acsSmartpointEnabled.value
    = acsSmartpointEnabledResult.data.value?.value === 'True'
  acsShippingSetting.value = acsShippingResult.data.value ?? null
  acsFreeShippingThresholdSetting.value
    = acsFreeShippingResult.data.value ?? null
  // B2B defaults to ``true`` if the endpoint is unreachable so a
  // transient settings-API failure doesn't silently hide the option.
  b2bInvoicingEnabled.value = b2bInvoicingResult.data.value?.value !== 'False'
  if (!b2bInvoicingEnabled.value) {
    formState.documentType = zOrderCreateDocumentType.enum.RECEIPT
    formState.billingVatId = ''
    formState.billingCountry = ''
  }
  countries.value = countriesResult.data.value ?? null
  payWays.value = payWaysResult.data.value ?? null
  savedAddresses.value = savedAddressesResult.data.value ?? []

  // Apply the main address to form state synchronously so the very
  // first SSR render (and the client's hydration render) already shows
  // the ``saved`` mode — no guest-form flash.
  if (mainAddressResult.data.value) {
    applyAddressToFormState(mainAddressResult.data.value)
    selectedSavedAddressId.value = mainAddressResult.data.value.id
    addressEntryMode.value = 'saved'
  }

  // Initialize payment method
  if (payWays.value?.results?.[0]) {
    formState.payWay = payWays.value.results[0].id
    formState.payWayId = payWays.value.results[0].id
    selectedPayWay.value = payWays.value.results[0]
  }

  // Fall back to the first listed country for first-time / guest users
  // whose main-address prefill didn't set one. Fetch regions once the
  // country is known (runs on SSR so the region dropdown hydrates with
  // the correct options rather than loading post-mount).
  if (!formState.country && countries.value?.results?.[0]) {
    formState.country = countries.value.results[0].alpha2
    formState.countryId = countries.value.results[0].alpha2
  }
  if (formState.country) {
    await fetchRegions()
  }

  /**
   * Re-fetches shipping settings from the server at submit time so the
   * displayed shipping cost is always current even if the page was loaded
   * hours ago.
   */
  const refetchShippingSettings = async () => {
    const [freshShipping, freshThreshold] = await Promise.all([
      $fetch<{ value: string }>('/api/settings/get', {
        query: { key: 'CHECKOUT_SHIPPING_PRICE' },
        headers: useRequestHeaders(),
      }).catch(() => null),
      $fetch<{ value: string }>('/api/settings/get', {
        query: { key: 'FREE_SHIPPING_THRESHOLD' },
        headers: useRequestHeaders(),
      }).catch(() => null),
    ])
    if (freshShipping) shippingSetting.value = freshShipping
    if (freshThreshold) freeShippingThresholdSetting.value = freshThreshold
  }

  return {
    formState,
    regions,
    selectedPayWay,
    countries,
    payWays,
    shippingPrice,
    countryOptions,
    regionOptions,
    payWayOptions,
    step1Schema,
    step2Schema,
    step3Schema,
    fetchRegions,
    savedAddresses,
    selectedSavedAddressId,
    selectSavedAddress,
    addressEntryMode,
    useNewAddress,
    b2bInvoicingEnabled,
    boxnowEnabled,
    acsSmartpointEnabled,
    acsShippingSetting,
    acsFreeShippingThresholdSetting,
    refetchShippingSettings,
  }
}
