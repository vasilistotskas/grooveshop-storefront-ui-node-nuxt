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

  const onCountryChange = async () => {
    formState.region = ''
    formState.regionId = undefined

    if (formState.country && countries.value?.results) {
      const selectedCountry = countries.value.results.find(c => c.alpha2 === formState.country)
      if (selectedCountry) {
        formState.countryId = selectedCountry.alpha2
      }
    }

    await fetchRegions()
  }

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

  watch(() => formState.payWay, (newPayWayId) => {
    if (newPayWayId && payWays.value?.results) {
      const payWay = payWays.value.results.find(pw => pw.id === newPayWayId)
      if (payWay) {
        selectedPayWay.value = payWay
        formState.payWayId = payWay.id
      }
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

  // Computed properties (also before await)
  const shippingPrice = computed(() => {
    if (!shippingSetting.value) return 0

    const baseShippingCost = parseFloat(shippingSetting.value.value)
    const freeShippingThreshold = freeShippingThresholdSetting.value
      ? parseFloat(freeShippingThresholdSetting.value.value)
      : 50.00

    const cartTotal = cart.value?.totalPrice || 0

    if (cartTotal >= freeShippingThreshold) {
      return 0
    }

    return baseShippingCost
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
    useAsyncData<Pagination<Country> | null>(
      () => `checkout:countries:${locale.value}`,
      () => $fetch<Pagination<Country>>('/api/countries', {
        method: 'GET',
        query: { languageCode: locale.value },
        headers: useRequestHeaders(),
      }).catch(() => null),
    ),
    useAsyncData<Pagination<PayWay> | null>(
      () => `checkout:pay-ways:${locale.value}`,
      () => $fetch<Pagination<PayWay>>('/api/pay-way', {
        method: 'GET',
        query: { languageCode: locale.value },
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
    fetchRegions,
    onCountryChange,
    savedAddresses,
    selectedSavedAddressId,
    selectSavedAddress,
    addressEntryMode,
    useNewAddress,
  }
}
