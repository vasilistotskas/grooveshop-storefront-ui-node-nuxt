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
    documentType: zDocumentTypeEnum.enum.RECEIPT,
    items: [] as { product: number, quantity: number }[],
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
   * User-invoked address picker: set the selected address id and hydrate
   * the form from its values. Kicks off a regions refresh so the region
   * dropdown shows the right options for the new country.
   */
  const selectSavedAddress = async (addressId: number | null) => {
    selectedSavedAddressId.value = addressId
    if (addressId === null) return
    const address = savedAddresses.value.find(a => a.id === addressId)
    if (!address) return
    applyAddressToFormState(address)
    await fetchRegions()
  }

  /**
   * Hydrate the checkout form from the user's saved main address. Called
   * once on mount when the user is logged in. Silent on 404 (no main
   * address yet) — other errors surface as a toast so the user knows the
   * saved-address lookup failed (they can still complete checkout by
   * typing the fields).
   */
  const applyMainAddressPrefill = async () => {
    if (!loggedIn.value) return false

    try {
      const address = await $fetch<UserAddressDetail>('/api/user/main-address', {
        method: 'GET',
        headers: useRequestHeaders(),
      })

      applyAddressToFormState(address)
      selectedSavedAddressId.value = address.id
      await fetchRegions()
      return true
    }
    catch (error) {
      // 404 = user has no main address yet — not an error worth surfacing.
      const status = (error as { statusCode?: number })?.statusCode
      if (status && status !== 404) {
        log.warn('checkout', 'Main address prefill failed', { error })
      }
      return false
    }
  }

  /**
   * Fetch the user's saved address book (for the picker dropdown).
   * Silent on error — the picker simply won't appear.
   */
  const fetchSavedAddresses = async () => {
    if (!loggedIn.value) return
    try {
      const response = await $fetch<Pagination<UserAddressDetail>>(
        '/api/user/addresses',
        {
          method: 'GET',
          headers: useRequestHeaders(),
          // The API accepts camelCase ordering keys — see
          // ``zListUserAddressQuery.ordering`` in shared/openapi/zod.gen.ts.
          // ``isMain`` first puts the user's main address at the top of
          // the picker, then most-recent by creation date.
          query: { pageSize: 50, ordering: '-isMain,-createdAt' },
        },
      )
      savedAddresses.value = response.results ?? []
    }
    catch (error) {
      log.warn('checkout', 'saved addresses fetch failed', { error })
    }
  }

  // Register all watchers/lifecycle hooks BEFORE await (Vue context requirement)
  onMounted(async () => {
    // Kick off the saved-address fetch in parallel with the main-address
    // prefill so the picker shows up as soon as the form is usable.
    const [filled] = await Promise.all([
      applyMainAddressPrefill(),
      fetchSavedAddresses(),
    ])

    if (filled) {
      toast.add({
        title: t('address.prefilled_title'),
        description: t('address.prefilled_description'),
        color: 'info',
        icon: 'i-heroicons-map-pin',
      })
      return
    }

    // Fallback to default country selection for first-time / guest users.
    if (countries.value?.results?.[0] && !formState.country) {
      formState.country = countries.value.results[0].alpha2
      formState.countryId = countries.value.results[0].alpha2
      await fetchRegions()
    }
  })

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
    if (newRegionAlpha && regions.value?.results) {
      const selectedRegion = regions.value.results.find(r => r.alpha === newRegionAlpha)
      if (selectedRegion) {
        formState.regionId = selectedRegion.alpha
      }
    }
    else {
      formState.regionId = undefined
    }
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
    place: z.string({ error: t('validation.required') }).min(3, {
      error: t('validation.place.min', { min: 3 }),
    }),
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
  })

  const step2Schema = z.object({
    payWay: z.number({ error: t('validation.payment_method.required') }).min(1, {
      error: t('validation.payment_method.required'),
    }),
  })

  // Fetch all checkout data in parallel (after all Vue composable calls)
  const [
    shippingResult,
    freeShippingResult,
    countriesResult,
    payWaysResult,
  ] = await Promise.all([
    $fetch<{ value: string }>('/api/settings/get', {
      method: 'GET',
      query: { key: 'CHECKOUT_SHIPPING_PRICE' },
      headers: useRequestHeaders(),
    }).catch(() => null),
    $fetch<{ value: string }>('/api/settings/get', {
      method: 'GET',
      query: { key: 'FREE_SHIPPING_THRESHOLD' },
      headers: useRequestHeaders(),
    }).catch(() => null),
    $fetch<Pagination<Country>>('/api/countries', {
      method: 'GET',
      query: { languageCode: locale.value },
      headers: useRequestHeaders(),
    }).catch(() => null),
    $fetch<Pagination<PayWay>>('/api/pay-way', {
      method: 'GET',
      query: { languageCode: locale.value },
      headers: useRequestHeaders(),
    }).catch(() => null),
  ])

  // Populate reactive refs with fetched data
  shippingSetting.value = shippingResult
  freeShippingThresholdSetting.value = freeShippingResult
  countries.value = countriesResult
  payWays.value = payWaysResult

  // Initialize payment method
  if (payWays.value?.results?.[0]) {
    formState.payWay = payWays.value.results[0].id
    formState.payWayId = payWays.value.results[0].id
    selectedPayWay.value = payWays.value.results[0]
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
  }
}
