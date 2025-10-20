<script lang="ts" setup>
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { toTypedSchema } from '@vee-validate/zod'
import { CalendarDate, DateFormatter, getLocalTimeZone } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'

defineSlots<{
  default(props: object): any
}>()

const { user, fetch } = useUserSession()
const { t, locale } = useI18n()
const toast = useToast()
const { $i18n } = useNuxtApp()

const regions = ref<Pagination<Region> | null>(null)
const userId = user.value?.id

const selectPlaceholder = computed(() => t('form.select_placeholder'))

const ZodAccountSettings = z.object({
  email: z.email({
    error: issue => issue.input === undefined
      ? $i18n.t('validation.required')
      : $i18n.t('validation.email.valid'),
  }),
  firstName: z.string({ error: issue => issue.input === undefined
    ? $i18n.t('validation.required')
    : $i18n.t('validation.string.invalid') }),
  lastName: z.string({ error: issue => issue.input === undefined
    ? $i18n.t('validation.required')
    : $i18n.t('validation.string.invalid') }),
  phone: z.string({ error: issue => issue.input === undefined
    ? $i18n.t('validation.required')
    : $i18n.t('validation.string.invalid') }),
  city: z.string({ error: issue => issue.input === undefined
    ? $i18n.t('validation.required')
    : $i18n.t('validation.string.invalid') }),
  zipcode: z.string({ error: issue => issue.input === undefined
    ? $i18n.t('validation.required')
    : $i18n.t('validation.string.invalid') }),
  address: z.string({ error: issue => issue.input === undefined
    ? $i18n.t('validation.required')
    : $i18n.t('validation.string.invalid') }),
  place: z.string({ error: issue => issue.input === undefined
    ? $i18n.t('validation.required')
    : $i18n.t('validation.string.invalid') }),
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
        ? $i18n.t('validation.date.required_error')
        : $i18n.t('validation.date.invalid_type_error'),
    }).optional(),
  ),
  country: z.string({ error: issue => issue.input === undefined
    ? $i18n.t('validation.required')
    : $i18n.t('validation.string.invalid') })
    .default(defaultSelectOptionChoose)
    .optional(),
  region: z.string({ error: issue => issue.input === undefined
    ? $i18n.t('validation.required')
    : $i18n.t('validation.string.invalid') })
    .default(defaultSelectOptionChoose)
    .optional(),
})

const validationSchema = toTypedSchema(ZodAccountSettings)

const initialValues = ZodAccountSettings.parse({
  email: user.value?.email || '',
  firstName: user.value?.firstName || '',
  lastName: user.value?.lastName || '',
  phone: user.value?.phone || '',
  city: user.value?.city || '',
  zipcode: user.value?.zipcode || '',
  address: user.value?.address || '',
  place: user.value?.place || '',
  birthDate: user.value?.birthDate ? new Date(user.value.birthDate) : undefined,
  country: user.value?.country || defaultSelectOptionChoose,
  region: user.value?.region || defaultSelectOptionChoose,
})

const { defineField, handleSubmit, errors, isSubmitting } = useForm({
  validationSchema,
  initialValues,
})

const [firstName, firstNameProps] = defineField('firstName', {
  validateOnModelUpdate: true,
})
const [lastName, lastNameProps] = defineField('lastName', {
  validateOnModelUpdate: true,
})
const [phone, phoneProps] = defineField('phone', {
  validateOnModelUpdate: true,
})
const [city, cityProps] = defineField('city', { validateOnModelUpdate: true })
const [zipcode, zipcodeProps] = defineField('zipcode', {
  validateOnModelUpdate: true,
})
const [address, addressProps] = defineField('address', {
  validateOnModelUpdate: true,
})
const [place, placeProps] = defineField('place', {
  validateOnModelUpdate: true,
})
const [country, countryProps] = defineField('country', {
  validateOnModelUpdate: true,
})
const [region, regionProps] = defineField('region', {
  validateOnModelUpdate: true,
})
const [birthDate] = defineField('birthDate', {
  validateOnModelUpdate: true,
})

const df = new DateFormatter('en-US', { dateStyle: 'medium' })

const calendarDate = shallowRef<DateValue | null>(
  birthDate.value && birthDate.value instanceof Date
    ? new CalendarDate(
        birthDate.value.getFullYear(),
        birthDate.value.getMonth() + 1,
        birthDate.value.getDate(),
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
  if (country.value === defaultSelectOptionChoose) {
    return
  }

  try {
    regions.value = await $fetch<ListRegionResponse>('/api/regions', {
      method: 'GET',
      query: {
        country: country.value,
        languageCode: locale.value,
      },
    })
  }
  catch {
    toast.add({
      title: $i18n.t('error.default'),
      description: $i18n.t('error_occurred'),
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
  country.value = String(payload)
  region.value = defaultSelectOptionChoose
  await fetchRegions()
}

const onSubmit = handleSubmit(async (values) => {
  if (
    values.region === defaultSelectOptionChoose
    || values.country === defaultSelectOptionChoose
  ) {
    values.region = undefined
    values.country = undefined
  }

  if (!userId) return

  await $fetch(`/api/user/account/${userId}`, {
    method: 'PUT',
    headers: useRequestHeaders(),
    body: {
      email: values.email,
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone,
      city: values.city,
      zipcode: values.zipcode,
      address: values.address,
      place: values.place,
      birthDate: values.birthDate ? values.birthDate.toISOString().split('T')[0] : null,
      country: values.country,
      region: values.region,
    },
    async onResponse({ response }) {
      if (!response.ok) {
        return
      }
      await fetch()
      toast.add({
        title: t('form.success'),
        color: 'success',
      })
    },
    onResponseError() {
      toast.add({ title: t('form.error'), color: 'error' })
    },
  })
})

const submitButtonDisabled = computed(() => {
  return isSubmitting.value || Object.keys(errors.value).length > 0
})

watch(calendarDate, (newVal) => {
  if (newVal) {
    birthDate.value = newVal.toDate(getLocalTimeZone())
  }
  else {
    birthDate.value = undefined
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
    <form
      id="accountSettingsForm"
      class="
        flex w-full flex-col gap-4 rounded bg-primary-100 p-4
        md:grid md:grid-cols-2
        dark:bg-primary-900
      "
      name="accountSettingsForm"
      @submit="onSubmit"
    >
      <div class="grid">
        <label
          class="
            mb-2 text-primary-950
            dark:text-primary-50
          "
          for="firstName"
        >
          {{ t('form.first_name') }}
        </label>
        <div class="grid">
          <FormTextInput
            id="firstName"
            v-model="firstName"
            :bind="firstNameProps"
            :placeholder="t('form.first_name')"
            :required="true"
            autocomplete="given-name"
            name="firstName"
            type="text"
          />
        </div>
        <span
          v-if="errors.firstName"
          class="relative px-4 py-3 text-xs text-red-600"
        >
          {{ errors.firstName }}
        </span>
      </div>

      <div class="grid">
        <label
          class="
            mb-2 text-primary-950
            dark:text-primary-50
          "
          for="lastName"
        >
          {{ t('form.last_name') }}
        </label>
        <div class="grid">
          <FormTextInput
            id="lastName"
            v-model="lastName"
            :bind="lastNameProps"
            :placeholder="t('form.last_name')"
            :required="true"
            autocomplete="family-name"
            name="lastName"
            type="text"
          />
        </div>
        <span
          v-if="errors.lastName"
          class="relative px-4 py-3 text-xs text-red-600"
        >
          {{ errors.lastName }}
        </span>
      </div>

      <div class="grid">
        <label
          class="
            mb-2 text-primary-950
            dark:text-primary-50
          "
          for="phone"
        >
          {{ t('form.phone') }}
        </label>
        <div class="grid">
          <FormTextInput
            id="phone"
            v-model="phone"
            :bind="phoneProps"
            :placeholder="t('form.phone')"
            autocomplete="tel"
            name="phone"
            type="text"
          />
        </div>
        <span
          v-if="errors.phone"
          class="relative px-4 py-3 text-xs text-red-600"
        >
          {{ errors.phone }}
        </span>
      </div>

      <div class="grid">
        <label
          class="
            mb-2 text-primary-950
            dark:text-primary-50
          "
          for="city"
        >
          {{ t('form.city') }}
        </label>
        <div class="grid">
          <FormTextInput
            id="city"
            v-model="city"
            :bind="cityProps"
            :placeholder="t('form.city')"
            autocomplete="address-level2"
            name="city"
            type="text"
          />
        </div>
        <span
          v-if="errors.city"
          class="relative px-4 py-3 text-xs text-red-600"
        >
          {{ errors.city }}
        </span>
      </div>

      <div class="grid">
        <label
          class="
            mb-2 text-primary-950
            dark:text-primary-50
          "
          for="zipcode"
        >
          {{ t('form.zipcode') }}
        </label>
        <div class="grid">
          <FormTextInput
            id="zipcode"
            v-model="zipcode"
            :bind="zipcodeProps"
            :placeholder="t('form.zipcode')"
            autocomplete="postal-code"
            name="zipcode"
            type="text"
          />
        </div>
        <span
          v-if="errors.zipcode"
          class="relative px-4 py-3 text-xs text-red-600"
        >
          {{ errors.zipcode }}
        </span>
      </div>

      <div class="grid">
        <label
          class="
            mb-2 text-primary-950
            dark:text-primary-50
          "
          for="address"
        >
          {{ t('form.address') }}
        </label>
        <div class="grid">
          <FormTextInput
            id="address"
            v-model="address"
            :bind="addressProps"
            :placeholder="t('form.address')"
            autocomplete="address-line1"
            name="address"
            type="text"
          />
        </div>
        <span
          v-if="errors.address"
          class="relative px-4 py-3 text-xs text-red-600"
        >
          {{ errors.address }}
        </span>
      </div>

      <div class="grid">
        <label
          class="
            mb-2 text-primary-950
            dark:text-primary-50
          "
          for="place"
        >
          {{ t('form.place') }}
        </label>
        <div class="grid">
          <FormTextInput
            id="place"
            v-model="place"
            :bind="placeProps"
            :placeholder="t('form.place')"
            autocomplete="address-level3"
            name="place"
            type="text"
          />
        </div>
        <span
          v-if="errors.place"
          class="relative px-4 py-3 text-xs text-red-600"
        >
          {{ errors.place }}
        </span>
      </div>

      <div class="grid">
        <label
          class="
            mb-2 text-primary-950
            dark:text-primary-50
          "
          for="birthDate"
        >
          {{ t('form.birth_date') }}
        </label>
        <div class="grid">
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
        </div>
        <span
          v-if="errors.birthDate"
          class="relative px-4 py-3 text-xs text-red-600"
        >
          {{ errors.birthDate }}
        </span>
      </div>

      <div class="grid">
        <label
          class="
            mb-2 text-primary-950
            dark:text-primary-50
          "
          for="country"
        >
          {{ t('form.country') }}
        </label>
        <div class="grid">
          <USelect
            id="country"
            v-model="country"
            name="country"
            value-key="value"
            :items="countryOptions"
            color="neutral"
            v-bind="countryProps"
            @update:model-value="onCountryChange"
          />
        </div>
        <span
          v-if="errors.country"
          class="relative px-4 py-3 text-xs text-red-600"
        >
          {{ errors.country }}
        </span>
      </div>

      <div class="grid">
        <label
          class="
            mb-2 text-primary-950
            dark:text-primary-50
          "
          for="region"
        >
          {{ t('form.region') }}
        </label>
        <div class="grid">
          <USelect
            id="region"
            v-model="region"
            name="region"
            :items="regionOptions"
            color="neutral"
            value-key="value"
            v-bind="regionProps"
          />
        </div>
        <span
          v-if="errors.region"
          class="relative px-4 py-3 text-xs text-red-600"
        >
          {{ errors.region }}
        </span>
      </div>

      <div class="col-span-2 grid items-end justify-end">
        <button
          :aria-busy="isSubmitting"
          :disabled="submitButtonDisabled"
          class="
            rounded bg-secondary px-4 py-2 font-bold text-primary-50
            disabled:cursor-not-allowed disabled:opacity-50
          "
          type="submit"
        >
          {{ t('form.submit') }}
        </button>
      </div>
    </form>
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
    submit: Υποβολή
    success: Τα στοιχεία αποθηκεύτηκαν επιτυχώς
    error: Σφάλμα
</i18n>
