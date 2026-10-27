import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import { getLocalTimeZone, parseDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '~~/i18n/locales'

/**
 * What the API accepts as a handle (`UsernameUpdateRequest`, Django's
 * `UsernameValidator`: `^[\w.@+#-]+\Z`). Python's `\w` is Unicode, so a
 * Greek handle is valid; JavaScript's `\w` is ASCII only, hence the
 * letter and number classes.
 */
const USERNAME_PATTERN = /^[\p{L}\p{N}_.@+#-]+$/u

/**
 * The account's settings form, apart from its drawing
 * (`Account/SettingsForm` and the tenants' own): the profile (name,
 * email, phone, address, birth day, language), the username, and the
 * country with the regions it has.
 *
 * The username is its own request, made before the profile is saved and
 * only when it changed (Django rejects a taken one; its reason, a 409
 * "Username already taken.", is toasted as it is). An empty one keeps the
 * current handle. A drawing that has no username field leaves it as it
 * was, so nothing is sent.
 *
 * The phone is optional (`UserAccount.phone` is blank) but, when present,
 * passes the same plausibility check checkout applies, against the country
 * picked in the phone field (it follows this form's own country until
 * then). Saved, the session is read again, and a changed language switches
 * the interface (`useUserLanguage`).
 *
 * `t` is the drawing's, for its own labels; `form` is its `UForm`, for the
 * errors Django names. Call it where `await` is allowed: the countries and
 * the user's regions are read before it returns.
 */
export async function useSettingsForm(options: {
  form: Readonly<Ref<ApiErrorForm | null>>
  t: ReturnType<typeof useI18n>['t']
}) {
  const { t } = options
  const { locale } = useNuxtApp().$i18n
  const { user, fetch } = useUserSession()
  const { changeUsername } = useChangeUsername()
  const { setLanguage } = useUserLanguage()
  const toast = useToast()
  const { notify } = useApiError()
  const { reportFailure } = useApiFormErrors(options.form, { fields: () => Object.keys(schema.shape) })

  const regions = ref<Pagination<Region> | null>(null)
  const userId = user.value?.id

  const selectPlaceholder = computed(() => t('form.select_placeholder'))

  const schema = z.object({
    email: z.email({
      error: issue => issue.input === undefined
        ? t('validation.required')
        : t('validation.email.valid'),
    }),
    firstName: z.string({ error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.string.invalid') }).max(255, {
      error: t('validation.max', { max: 255 }),
    }),
    lastName: z.string({ error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.string.invalid') }).max(255, {
      error: t('validation.max', { max: 255 }),
    }),
    // Empty keeps the current handle; a new one goes through the
    // dedicated change-username request, which rejects a taken one.
    username: z.string({ error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.string.invalid') }).max(30, {
      error: t('validation.max', { max: 30 }),
    }).refine(value => !value || USERNAME_PATTERN.test(value), {
      error: t('form.username_invalid'),
    }),
    // Optional in Django (UserAccount.phone is blank=True) but when
    // present it must pass the same plausibility check the checkout
    // applies, against the country picked in the phone field (it follows
    // this form's own country until then — see ``formCountry``).
    phone: z.string({ error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.string.invalid') }).refine(
      value => !value || isPlausiblePhone(
        value,
        resolvePhoneCountry(countries.value?.results, phonePick.value) ?? formCountry.value,
      ),
      { error: t('validation.phone.invalid') },
    ),
    city: z.string({ error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.string.invalid') }).max(255, {
      error: t('validation.max', { max: 255 }),
    }),
    zipcode: z.string({ error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.string.invalid') }).max(255, {
      error: t('validation.max', { max: 255 }),
    }),
    address: z.string({ error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.string.invalid') }).max(255, {
      error: t('validation.max', { max: 255 }),
    }),
    place: z.string({ error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.string.invalid') }).max(255, {
      error: t('validation.max', { max: 255 }),
    }).optional(),
    birthDate: z.preprocess(
      (input) => {
        if (typeof input === 'string' || input instanceof Date) {
          const date = new Date(input)
          return isNaN(date.getTime()) ? undefined : date
        }
        return undefined
      },
      z.date({
        error: issue => issue.input === undefined
          ? t('validation.date.required_error')
          : t('validation.date.invalid_type_error'),
      }).optional(),
    ),
    country: z.string({ error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.string.invalid') })
      .default(defaultSelectOptionChoose)
      .optional(),
    region: z.string({ error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.string.invalid') })
      .default(defaultSelectOptionChoose)
      .optional(),
    languageCode: z.enum(SUPPORTED_LOCALES, {
      error: () => t('validation.string.invalid'),
    }).default(DEFAULT_LOCALE),
  })

  type Schema = z.output<typeof schema>

  const userLanguage = (user.value?.languageCode && SUPPORTED_LOCALES.includes(user.value.languageCode as typeof SUPPORTED_LOCALES[number]))
    ? user.value.languageCode as typeof SUPPORTED_LOCALES[number]
    : DEFAULT_LOCALE

  // The country picked in the phone field; empty while it follows the form's.
  const phonePick = ref('')

  const state = reactive<Partial<Schema>>({
    email: user.value?.email || '',
    firstName: user.value?.firstName || '',
    lastName: user.value?.lastName || '',
    username: user.value?.username || '',
    // Stored as E.164 (e.g. "+306912345678"); the phone field parses it back
    // into its country picker and the national digits.
    phone: user.value?.phone || '',
    city: user.value?.city || '',
    zipcode: user.value?.zipcode || '',
    address: user.value?.address || '',
    place: user.value?.place || '',
    // Mirrors `calendarDate` (the watch at the end), which holds the saved day.
    birthDate: undefined,
    country: user.value?.country || defaultSelectOptionChoose,
    region: user.value?.region || defaultSelectOptionChoose,
    languageCode: userLanguage,
  })

  // Every country with a dial code, unpaginated (the shared phone source):
  // the account's country is not a delivery address, so it is not limited to
  // what the store ships to. (The default page holds 12 rows.)
  const countriesRequest = usePhoneCountries()
  const { data: countries } = countriesRequest

  // The form's own (live) country field, falling back to the first listed
  // country while it's still the unselected placeholder: what the phone field
  // follows, and what validates the phone until a country is picked in it.
  // Referenced by the ``phone`` refine above; the closure resolves it lazily
  // at validation time, by when this is already initialised.
  //
  // A plain ref updated via watch() — not a computed reading
  // state.country directly — because a computed's initializer touching
  // state (typed Partial<Schema>) closes a cycle back through the
  // schema's own phone refine (schema -> formCountry -> state ->
  // Schema -> schema, TS2456). Explicitly typing this ref breaks it: the
  // watch callback below still reads state.country, but that's a
  // separate statement, not part of formCountry's own type.
  const formCountry = ref<Country | undefined>()
  watch(() => state.country, (newCountry) => {
    formCountry.value = resolvePhoneCountry(
      countries.value?.results,
      newCountry !== defaultSelectOptionChoose ? newCountry : undefined,
      { fallbackToFirst: true },
    )
  })

  const languageOptions = computed(() => {
    const names = new Intl.DisplayNames([locale.value], { type: 'language' })
    return SUPPORTED_LOCALES.map(code => ({
      label: names.of(code) ?? code,
      value: code,
    }))
  })

  const isSubmitting = ref(false)

  // Django's birth date is a plain 'YYYY-MM-DD' day. Parse it as one:
  // `new Date('YYYY-MM-DD')` is UTC midnight, the day before west of UTC.
  const calendarDate = shallowRef<DateValue | null>(
    user.value?.birthDate ? parseDate(user.value.birthDate) : null,
  )

  const countryOptions = computed(() => {
    const options = countries.value?.results?.map((country) => {
      const countryName = extractTranslated(country, 'name', locale.value)
      return {
        label: countryName,
        value: country.alpha2,
      }
    }) || []

    return [
      {
        label: selectPlaceholder.value,
        value: defaultSelectOptionChoose,
        disabled: true,
      },
      ...options,
    ]
  })

  const fetchRegions = async () => {
    if (state.country === defaultSelectOptionChoose) {
      return
    }

    try {
      regions.value = await $api<ListRegionResponse>('/api/regions', {
        method: 'GET',
        query: {
          country: state.country,
          languageCode: locale.value,
        },
      })
    }
    catch (error) {
      notify('settings:regions', error, { title: t('error.default') })
    }
  }

  const regionOptions = computed(() => {
    const options = regions.value?.results?.map((region) => {
      const regionName = extractTranslated(region, 'name', locale.value)
      return {
        label: regionName,
        value: region.alpha,
      }
    }) || []

    return [
      {
        label: selectPlaceholder.value,
        value: defaultSelectOptionChoose,
        disabled: true,
      },
      ...options,
    ]
  })

  const onCountryChange = async (payload: string | undefined) => {
    if (!payload) return
    state.country = String(payload)
    state.region = defaultSelectOptionChoose
    await fetchRegions()
  }

  const onSubmit = async (event: FormSubmitEvent<Schema>) => {
    isSubmitting.value = true

    const values = { ...event.data }

    if (
      values.region === defaultSelectOptionChoose
      || values.country === defaultSelectOptionChoose
    ) {
      values.region = undefined
      values.country = undefined
    }

    if (!userId) {
      isSubmitting.value = false
      return
    }

    const previousLanguage = locale.value
    const nextLanguage = values.languageCode || DEFAULT_LOCALE

    // The username is saved (and the session read again) whatever the
    // profile save below does, or a failed save would leave the old name
    // and the next submit would ask for the same change (409, taken).
    if (values.username && values.username !== user.value?.username
      && !await changeUsername(userId, values.username, t('form.error'))) {
      isSubmitting.value = false
      return
    }

    try {
      await $api(`/api/user/account/${userId}`, {
        method: 'PUT',
        body: {
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          city: values.city,
          zipcode: values.zipcode,
          address: values.address,
          place: values.place,
          // Serialize the picked day straight from the timezone-agnostic
          // CalendarDate — its toString() yields 'YYYY-MM-DD' directly. Never go
          // via Date.toISOString(), which converts local midnight to UTC and
          // shifts the day back for UTC+ timezones (e.g. Europe/Athens),
          // compounding one day per save.
          birthDate: calendarDate.value ? calendarDate.value.toString() : null,
          country: values.country,
          region: values.region,
          languageCode: nextLanguage,
        },
      })
    }
    catch (error) {
      // ofetch rejects on a 4xx/5xx; rethrown, UForm would hand it to
      // Vue's error handler as an app error.
      await reportFailure('account:update', error, { title: t('form.error') })
      isSubmitting.value = false
      return
    }

    await fetch()
    if (nextLanguage !== previousLanguage) {
      // setLanguage keeps UI locale, i18n cookie, and Django's stored
      // language_code in sync; the PUT above already wrote the new value,
      // so this call only flips the UI locale (the subsequent PATCH is a
      // no-op when stored === code).
      await setLanguage(nextLanguage)
    }
    toast.add({
      title: t('form.success'),
      color: 'success',
    })
    isSubmitting.value = false
  }

  watch(calendarDate, (newVal) => {
    if (newVal) {
      state.birthDate = newVal.toDate(getLocalTimeZone())
    }
    else {
      state.birthDate = undefined
    }
  }, { immediate: true })

  // Everything that registers with the component is above; only now wait.
  await countriesRequest
  formCountry.value = resolvePhoneCountry(
    countries.value?.results,
    user.value?.country,
    { fallbackToFirst: true },
  )
  if (countries.value) {
    await fetchRegions()
  }

  return {
    schema,
    state,
    isSubmitting,
    phonePick,
    formCountry,
    calendarDate,
    languageOptions,
    countryOptions,
    regionOptions,
    onCountryChange,
    onSubmit,
  }
}
