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
    : t('validation.string.invalid') }),
  lastName: z.string({ error: issue => issue.input === undefined
    ? t('validation.required')
    : t('validation.string.invalid') }),
  phone: z.string({ error: issue => issue.input === undefined
    ? t('validation.required')
    : t('validation.string.invalid') }),
  city: z.string({ error: issue => issue.input === undefined
    ? t('validation.required')
    : t('validation.string.invalid') }),
  zipcode: z.string({ error: issue => issue.input === undefined
    ? t('validation.required')
    : t('validation.string.invalid') }),
  address: z.string({ error: issue => issue.input === undefined
    ? t('validation.required')
    : t('validation.string.invalid') }),
  place: z.string({ error: issue => issue.input === undefined
    ? t('validation.required')
    : t('validation.string.invalid') }),
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

const state = reactive<Partial<Schema>>({
  email: user.value?.email || '',
  firstName: user.value?.firstName || '',
  lastName: user.value?.lastName || '',
  // Stored as E.164 (e.g. "+306912345678"); strip the +30 for display
  // so it pairs cleanly with the sticky "+30" leading badge.
  phone: stripGreekPrefixForDisplay(user.value?.phone),
  city: user.value?.city || '',
  zipcode: user.value?.zipcode || '',
  address: user.value?.address || '',
  place: user.value?.place || '',
  birthDate: user.value?.birthDate ? new Date(user.value.birthDate) : undefined,
  country: user.value?.country || defaultSelectOptionChoose,
  region: user.value?.region || defaultSelectOptionChoose,
  languageCode: userLanguage,
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

const { data: countries } = await useFetch('/api/countries', {
  key: 'countries',
  method: 'GET',
  headers: useRequestHeaders(),
  query: {
    languageCode: locale,
  },
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
    regions.value = await $fetch<ListRegionResponse>('/api/regions', {
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

  await $fetch(`/api/user/account/${userId}`, {
    method: 'PUT',
    body: {
      email: values.email,
      firstName: values.firstName,
      lastName: values.lastName,
      phone: normalizeGreekPhone(values.phone),
      city: values.city,
      zipcode: values.zipcode,
      address: values.address,
      place: values.place,
      birthDate: values.birthDate ? values.birthDate.toISOString().split('T')[0] : null,
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
        />
      </UFormField>

      <UFormField
        :label="t('form.phone')"
        name="phone"
      >
        <UInput
          v-model="state.phone"
          type="tel"
          autocomplete="tel-national"
          inputmode="tel"
          :placeholder="t('form.phone_placeholder')"
          class="w-full"
        >
          <template #leading>
            <span class="pl-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">+30</span>
          </template>
        </UInput>
      </UFormField>

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
          :aria-busy="isSubmitting"
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
    phone_placeholder: 6912345678
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
</i18n>
