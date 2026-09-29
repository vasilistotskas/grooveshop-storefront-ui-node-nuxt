<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import { CalendarDate, DateFormatter, getLocalTimeZone } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '~~/i18n/locales'

defineSlots<{
  default(props: object): any
}>()

const { user, fetch } = useUserSession()
const { t, locale } = useI18n()
const { setLanguage } = useUserLanguage()
const toast = useToast()

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

// Every country with a dial code, unpaginated (the shared phone source):
// the account's country is not a delivery address, so it is not limited to
// what the store ships to. (The default page holds 12 rows.)
const { data: countries } = await usePhoneCountries()

// The country picked in the phone field; empty while it follows the form's.
const phonePick = ref('')

const state = reactive<Partial<Schema>>({
  email: user.value?.email || '',
  firstName: user.value?.firstName || '',
  lastName: user.value?.lastName || '',
  // Stored as E.164 (e.g. "+306912345678"); the phone field parses it back
  // into its country picker and the national digits.
  phone: user.value?.phone || '',
  city: user.value?.city || '',
  zipcode: user.value?.zipcode || '',
  address: user.value?.address || '',
  place: user.value?.place || '',
  birthDate: user.value?.birthDate ? new Date(user.value.birthDate) : undefined,
  country: user.value?.country || defaultSelectOptionChoose,
  region: user.value?.region || defaultSelectOptionChoose,
  languageCode: userLanguage,
})

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
const formCountry = ref<Country | undefined>(resolvePhoneCountry(
  countries.value?.results,
  user.value?.country,
  { fallbackToFirst: true },
))
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

const df = new DateFormatter('en-US', { dateStyle: 'medium' })

const calendarDate = shallowRef<DateValue | null>(
  state.birthDate && state.birthDate instanceof Date
    ? new CalendarDate(
        state.birthDate.getFullYear(),
        state.birthDate.getMonth() + 1,
        state.birthDate.getDate(),
      )
    : null,
)

const label = computed(() => {
  return calendarDate.value
    ? df.format(calendarDate.value.toDate(getLocalTimeZone()))
    : t('form.birth_date')
})

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
  catch {
    toast.add({
      title: t('error.default'),
      description: t('error_occurred'),
      color: 'error',
    })
  }
}

if (countries.value) {
  await fetchRegions()
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
    async onResponse({ response }) {
      if (!response.ok) {
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
    },
    onResponseError() {
      toast.add({ title: t('form.error'), color: 'error' })
      isSubmitting.value = false
    },
  })
}

watch(calendarDate, (newVal) => {
  if (newVal) {
    state.birthDate = newVal.toDate(getLocalTimeZone())
  }
  else {
    state.birthDate = undefined
  }
})
</script>

<template>
  <div
    class="
      grid gap-4
      lg:flex
    "
  >
    <slot />
    <UForm
      id="accountSettingsForm"
      :schema="schema"
      :state="state"
      class="
        flex w-full flex-col gap-4 rounded bg-primary-100 p-4
        md:grid md:grid-cols-2
        dark:bg-primary-900
      "
      @error="scrollToFirstFormError"
      @submit="onSubmit"
    >
      <UFormField
        :label="t('form.first_name')"
        name="firstName"
        :required="true"
      >
        <UInput
          v-model="state.firstName"
          :placeholder="t('form.first_name')"
          autocomplete="given-name"
          class="w-full"
          type="text"
          icon="i-heroicons-user"
          size="xl"
        />
      </UFormField>

      <UFormField
        :label="t('form.last_name')"
        name="lastName"
        :required="true"
      >
        <UInput
          v-model="state.lastName"
          :placeholder="t('form.last_name')"
          autocomplete="family-name"
          class="w-full"
          type="text"
          icon="i-heroicons-user"
          size="xl"
        />
      </UFormField>

      <FormPhoneInput
        v-model="state.phone"
        v-model:country="phonePick"
        :label="t('form.phone')"
        name="phone"
        :follow-country="formCountry?.alpha2"
        size="xl"
      />

      <UFormField
        :label="t('form.city')"
        name="city"
      >
        <UInput
          v-model="state.city"
          :placeholder="t('form.city')"
          autocomplete="address-level2"
          class="w-full"
          type="text"
          icon="i-heroicons-building-office-2"
          size="xl"
        />
      </UFormField>

      <UFormField
        :label="t('form.zipcode')"
        name="zipcode"
      >
        <UInput
          v-model="state.zipcode"
          :placeholder="t('form.zipcode')"
          autocomplete="postal-code"
          class="w-full"
          type="text"
          size="xl"
        />
      </UFormField>

      <UFormField
        :label="t('form.address')"
        name="address"
      >
        <UInput
          v-model="state.address"
          :placeholder="t('form.address')"
          autocomplete="address-line1"
          class="w-full"
          type="text"
          icon="i-heroicons-map-pin"
          size="xl"
        />
      </UFormField>

      <UFormField
        :label="t('form.place')"
        name="place"
      >
        <UInput
          v-model="state.place"
          :placeholder="t('form.place')"
          autocomplete="address-level3"
          class="w-full"
          type="text"
          icon="i-heroicons-map"
          size="xl"
        />
      </UFormField>

      <UFormField
        :label="t('form.birth_date')"
        name="birthDate"
      >
        <UPopover :popper="{ placement: 'bottom-start' }">
          <UButton
            :label="label"
            color="neutral"
            icon="i-heroicons-calendar-days-20-solid"
          />
          <template #content>
            <UCalendar
              v-model="calendarDate"
              color="secondary"
              class="p-2"
            />
          </template>
        </UPopover>
      </UFormField>

      <UFormField
        :label="t('form.country')"
        name="country"
      >
        <USelect
          v-model="state.country"
          name="country"
          autocomplete="country"
          value-key="value"
          :items="countryOptions"
          color="neutral"
          class="w-full"
          @update:model-value="onCountryChange"
        />
      </UFormField>

      <UFormField
        :label="t('form.region')"
        name="region"
      >
        <USelect
          v-model="state.region"
          name="region"
          autocomplete="address-level1"
          :items="regionOptions"
          color="neutral"
          class="w-full"
          value-key="value"
        />
      </UFormField>

      <UFormField
        :label="t('form.language')"
        name="languageCode"
        :description="t('form.language_help')"
      >
        <USelect
          v-model="state.languageCode"
          name="languageCode"
          :items="languageOptions"
          :disabled="languageOptions.length < 2"
          color="neutral"
          class="w-full"
          value-key="value"
        />
      </UFormField>

      <div class="col-span-2 grid items-end justify-end">
        <UButton
          :loading="isSubmitting"
          :disabled="isSubmitting"
          :label="t('form.submit')"
          type="submit"
          color="secondary"
          size="lg"
        />
      </div>
    </UForm>
  </div>
</template>

<i18n lang="yaml">
el:
  form:
    select_placeholder: Επέλεξε
    first_name: Όνομα
    last_name: Επώνυμο
    phone: Τηλέφωνο
    city: Πόλη
    zipcode: Ταχυδρομικός κώδικας
    address: Διεύθυνση
    place: Τοποθεσία
    birth_date: Ημερομηνία γέννησης
    country: Χώρα
    region: Περιοχή
    language: Γλώσσα
    language_help: Χρησιμοποιείται για email και μηνύματα διεπαφής.
    submit: Υποβολή
    success: Τα στοιχεία αποθηκεύτηκαν επιτυχώς
    error: Σφάλμα
en:
  form:
    select_placeholder: Choose
    first_name: First name
    last_name: Last name
    phone: Phone
    city: City
    zipcode: Postcode
    address: Address
    place: Location
    birth_date: Date of birth
    country: Country
    region: Region
    language: Language
    language_help: Used for emails and for the interface.
    submit: Save
    success: Your details were saved
    error: That did not work
</i18n>
