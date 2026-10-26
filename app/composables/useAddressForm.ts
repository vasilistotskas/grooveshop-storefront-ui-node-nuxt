import type * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

/**
 * The saved-address form, apart from its drawing: a new address
 * (`Storefront/Account/AddressNew`) or an edit of one
 * (`Storefront/Account/AddressEdit`), in every tree.
 *
 * It owns the form's schema, state, the lists its selects offer (the
 * store's shippable countries, the chosen country's regions, floors,
 * location types), the save (POST for a new address, PUT for an edit;
 * Django's field errors land under their inputs, the rest in a toast), and
 * "set as main". Saved or set, the shopper goes back to the addresses.
 *
 * The schema is the generated contract schema, tightened with the same
 * client-side phone plausibility check and delivery-address rules checkout
 * applies (the OpenAPI schema can express neither, and Django
 * re-validates). `region` is `.nullish()` on the generated schema
 * (`UserAddressWriteSerializer.region` is optional); it is required here
 * only when the selected country has regions (`Country.hasRegions`).
 *
 * `t` is the drawing's, for its own labels; `messages` are its toast
 * titles. `edit` is the row being edited (`useUserAddress`) with the titles
 * of "set as main"; leave it out for a new address. Call it where `await` is allowed: the countries and
 * regions are read before it returns.
 */
export async function useAddressForm(options: {
  form: Readonly<Ref<ApiErrorForm | null>>
  t: ReturnType<typeof useI18n>['t']
  messages: () => { saved: string, saveError: string }
  edit?: {
    addressId: string | string[] | undefined
    address: UserAddress | null | undefined
    /** The toast titles of "set as main". */
    mainMessages: () => { set: string, error: string }
  }
}) {
  const { t, edit } = options
  const { locale } = useNuxtApp().$i18n
  const toast = useToast()
  const { notify } = useApiError()
  const { reportFailure } = useApiFormErrors(options.form, { fields: () => Object.keys(schema.shape) })
  const localePath = useLocalePath()

  const isSubmitting = ref(false)

  // Every dial code, for the phone field's country picker, and the country
  // the shopper picked there (empty while it follows the form's country).
  const { data: phoneCountries } = usePhoneCountries()
  const phonePick = ref('')

  const schema = zUserAddressWriteRequest.superRefine((data, ctx) => {
    const country = selectedCountry(data.country)
    refineAddress(ctx, country, data, t)
    if (country?.hasRegions !== false && !(data.region ?? '').trim()) {
      ctx.addIssue({ path: ['region'], code: 'custom', message: t('validation.required') })
    }
    // The phone is E.164, built by ``FormPhoneInput`` from the country picked
    // in the field (it follows the form's country until then).
    const phoneCountry = resolvePhoneCountry(phoneCountries.value?.results, phonePick.value) ?? country
    if (!isPlausiblePhone(data.phone, phoneCountry)) {
      ctx.addIssue({
        path: ['phone'],
        code: 'custom',
        message: phoneCountry?.phoneMetadata?.exampleMobile
          ? t('validation.phone.invalid_example', { example: phoneCountry.phoneMetadata.exampleMobile })
          : t('validation.phone.invalid'),
      })
    }
  })

  type Schema = z.output<typeof schema>

  // ``region`` narrowed to drop ``null``: the generated schema allows it
  // (Django's serializer accepts a blank region), but this form only ever
  // assigns it a string or leaves it undefined, and USelect's v-model
  // doesn't accept null.
  const address = edit?.address
  const state = reactive<Partial<Omit<Schema, 'region'>> & { region?: string }>({
    title: address?.title,
    firstName: address?.firstName,
    lastName: address?.lastName,
    street: address?.street,
    streetNumber: address?.streetNumber,
    city: address?.city,
    zipcode: address?.zipcode,
    // Stored as E.164 (e.g. "+306912345678"); the phone field parses it back
    // into its country picker and the national digits.
    phone: address?.phone,
    notes: address?.notes,
    isMain: address ? address.isMain : false,
    country: address?.country,
    region: address?.region ?? undefined,
    floor: address?.floor,
    locationType: address?.locationType,
  })

  // Countries — shippable only: a country this store doesn't ship to would
  // 400 at submit either way.
  const countriesRequest = useApi('/api/countries', {
    key: 'countries-shippable',
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      languageCode: locale,
      shippable: true,
    },
  })
  const { data: countries } = countriesRequest

  // The query is reactive, so a country change refetches by itself;
  // `enabled` holds it back until there is a country to ask about.
  const regionsRequest = useApi<Pagination<Region>>(
    '/api/regions',
    {
      enabled: computed(() => !!state.country),
      query: computed(() => ({
        country: state.country,
        languageCode: locale.value,
      })),
    },
  )
  const { data: regions } = regionsRequest

  // The row carrying the country's postcode format — the one Django
  // validates the address against.
  function selectedCountry(alpha2: string | undefined) {
    return countries.value?.results?.find(country => country.alpha2 === alpha2)
  }

  const countryOptions = computed(() => {
    return (
      countries.value?.results?.map(country => ({
        label: extractTranslated(country, 'name', locale.value),
        value: country.alpha2,
      })) || []
    )
  })

  // The store's shippable countries, listed first in the phone picker.
  const shippableCountryCodes = computed(() => countryOptions.value.map(option => option.value))

  const regionOptions = computed(() => {
    return (
      regions.value?.results?.map(region => ({
        label: extractTranslated(region, 'name', locale.value),
        value: region.alpha,
      })) || []
    )
  })

  const floorOptions = computed(() => [
    { label: t('form.floor_options.BASEMENT'), value: 'BASEMENT' },
    { label: t('form.floor_options.GROUND_FLOOR'), value: 'GROUND_FLOOR' },
    { label: t('form.floor_options.FIRST_FLOOR'), value: 'FIRST_FLOOR' },
    { label: t('form.floor_options.SECOND_FLOOR'), value: 'SECOND_FLOOR' },
    { label: t('form.floor_options.THIRD_FLOOR'), value: 'THIRD_FLOOR' },
    { label: t('form.floor_options.FOURTH_FLOOR'), value: 'FOURTH_FLOOR' },
    { label: t('form.floor_options.FIFTH_FLOOR'), value: 'FIFTH_FLOOR' },
    { label: t('form.floor_options.SIXTH_FLOOR_PLUS'), value: 'SIXTH_FLOOR_PLUS' },
  ])

  const locationTypeOptions = computed(() => [
    { label: t('form.location_type_options.HOME'), value: 'HOME' },
    { label: t('form.location_type_options.OFFICE'), value: 'OFFICE' },
    { label: t('form.location_type_options.OTHER'), value: 'OTHER' },
  ])

  // A new country's regions are its own: the old pick no longer applies.
  watch(
    () => state.country,
    (newCountry) => {
      if (newCountry) state.region = undefined
    },
  )

  async function onSubmit(event: FormSubmitEvent<Schema>) {
    if (isSubmitting.value) return
    isSubmitting.value = true
    const body = {
      ...event.data,
      // Canonical form, the same one Django stores.
      zipcode: normalizePostcode(event.data.zipcode),
    }
    try {
      if (edit) {
        await $api(`/api/user/addresses/${edit.addressId}`, {
          method: 'PUT',
          headers: useRequestHeaders(),
          body,
        })
      }
      else {
        await $api('/api/user/addresses', {
          method: 'POST',
          headers: useRequestHeaders(),
          body,
        })
      }

      toast.add({
        title: options.messages().saved,
        color: 'success',
      })

      await navigateTo(localePath('account-addresses'))
    }
    catch (error) {
      await reportFailure(edit ? 'address:update' : 'address:create', error, { title: options.messages().saveError })
    }
    finally {
      isSubmitting.value = false
    }
  }

  /** Make the address being edited the main one. */
  async function onSetMain() {
    if (!edit) return
    try {
      await $api(`/api/user/addresses/${edit.addressId}/set-main`, {
        method: 'POST',
        headers: useRequestHeaders(),
      })

      toast.add({
        title: edit.mainMessages().set,
        color: 'success',
      })

      await navigateTo(localePath('account-addresses'))
    }
    catch (error) {
      notify('address:set-main', error, { title: edit.mainMessages().error })
    }
  }

  await Promise.all([countriesRequest, regionsRequest])

  return {
    schema,
    state,
    isSubmitting,
    phonePick,
    selectedCountry,
    countryOptions,
    shippableCountryCodes,
    regionOptions,
    floorOptions,
    locationTypeOptions,
    onSubmit,
    onSetMain,
  }
}
