<script lang="ts" setup>
import { z } from 'zod'

import { defaultSelectOptionChoose } from '~/constants'
import type { Pagination } from '~/types/pagination'
import type { Region } from '~/types/region'

const { user, fetch } = useUserSession()
const { fetchUser } = useAuth()

const { t, locale } = useI18n()
const toast = useToast()

const USelect = resolveComponent('USelect')

const regions = ref<Pagination<Region> | null>(null)
const userId = user.value?.id

const ZodAccountSettings = z.object({
  email: z.string({ required_error: t('common.validation.required') }).email({
    message: t('pages.account.settings.validation.email.invalid'),
  }),
  firstName: z.string({ required_error: t('common.validation.required') }),
  lastName: z.string({ required_error: t('common.validation.required') }),
  phone: z.string({ required_error: t('common.validation.required') }),
  city: z.string({ required_error: t('common.validation.required') }),
  zipcode: z.string({ required_error: t('common.validation.required') }),
  address: z.string({ required_error: t('common.validation.required') }),
  place: z.string({ required_error: t('common.validation.required') }),
  birthDate: z.coerce
    .date({
      required_error: t('common.validation.date.required_error'),
      invalid_type_error: t('common.validation.date.invalid_type_error'),
    })
    .optional(),
  country: z.string({ required_error: t('common.validation.required') }).default(defaultSelectOptionChoose).optional(),
  region: z.string({ required_error: t('common.validation.required') }).default(defaultSelectOptionChoose).optional(),
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
  birthDate:
    user.value?.birthDate || new Date('2000-01-01').toISOString().slice(0, 10),
  country: user.value?.country || defaultSelectOptionChoose,
  region: user.value?.region || defaultSelectOptionChoose,
})

const { defineField, handleSubmit, errors, isSubmitting } = useForm({
  validationSchema,
  initialValues,
})

const [email] = defineField('email')
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
const [birthDate] = defineField('birthDate')

const date = ref(new Date())

const { data: countries } = await useAsyncData('countries', () =>
  $fetch('/api/countries', {
    method: 'GET',
    query: {
      language: locale.value,
    },
  }),
)

const countryOptions = computed(() => {
  return countries.value?.results?.map((country) => {
    const countryName = extractTranslated(country, 'name', locale.value)
    return {
      name: countryName,
      value: country.alpha2,
    }
  }) || []
})

const fetchRegions = async () => {
  if (country.value === defaultSelectOptionChoose) {
    return
  }

  try {
    regions.value = await $fetch('/api/regions', {
      method: 'GET',
      query: {
        country: country.value,
        language: locale.value,
      },
    })
  }
  catch (error) {
    toast.add({
      title: t('common.error.default'),
      description: t('common.error_occurred'),
      color: 'red',
    })
  }
}
const regionOptions = computed(() => {
  return regions.value?.results?.map((region) => {
    const regionName = extractTranslated(region, 'name', locale.value)
    return {
      name: regionName,
      value: region.alpha,
    }
  }) || []
})

const label = computed(() => {
  if (birthDate.value) {
    return birthDate.value.toLocaleDateString('en-us', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
  return date.value.toLocaleDateString('en-us', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
})

const onCountryChange = async (event: Event) => {
  if (!(event.target instanceof HTMLSelectElement)) return
  country.value = event.target.value
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
    body: {
      email: values.email,
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone,
      city: values.city,
      zipcode: values.zipcode,
      address: values.address,
      place: values.place,
      birthDate: values.birthDate?.toISOString().slice(0, 10),
      country: values.country,
      region: values.region,
    },
    async onResponse({ response }) {
      if (!response.ok) {
        return
      }
      await fetchUser()
      await fetch()
      toast.add({
        title: t('pages.account.settings.form.success'),
        color: 'green',
      })
    },
    onResponseError() {
      toast.add({ title: t('pages.account.settings.form.error'), color: 'red' })
    },
  })
})

const submitButtonDisabled = computed(() => {
  return isSubmitting.value || Object.keys(errors.value).length > 0
})

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      container flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle :text="$t('pages.account.settings.title')" />
    <DevOnly>
      <UserAccountSettingsNavbar />
    </DevOnly>
    <div class="grid items-center justify-start pt-4">
      <span
        class="
          text-primary-500 cursor-not-allowed rounded-md border
          border-primary-500 p-2 italic

          dark:text-primary-400 dark:border-primary-500
        "
      >{{ email }}</span>
    </div>
    <PageBody>
      <form
        id="accountSettingsForm"
        class="
          _form bg-primary-100 grid gap-4 rounded p-4

          dark:bg-primary-900

          md:grid-cols-2
        "
        name="accountSettingsForm"
        @submit="onSubmit"
      >
        <div class="grid">
          <label
            class="
              text-primary-950 mb-2

              dark:text-primary-50
            "
            for="firstName"
          >{{ $t('pages.account.settings.form.first_name') }}</label>
          <div class="grid">
            <FormTextInput
              id="firstName"
              v-model="firstName"
              :bind="firstNameProps"
              name="firstName"
              type="text"
              :placeholder="$t('pages.account.settings.form.first_name')"
              autocomplete="given-name"
              :required="true"
            />
          </div>
          <span
            v-if="errors.firstName"
            class="relative px-4 py-3 text-xs text-red-600"
          >{{ errors.firstName }}</span>
        </div>
        <div class="grid">
          <label
            class="
              text-primary-950 mb-2

              dark:text-primary-50
            "
            for="lastName"
          >{{ $t('pages.account.settings.form.last_name') }}</label>
          <div class="grid">
            <FormTextInput
              id="lastName"
              v-model="lastName"
              :bind="lastNameProps"
              name="lastName"
              type="text"
              :placeholder="$t('pages.account.settings.form.last_name')"
              autocomplete="family-name"
              :required="true"
            />
          </div>
          <span
            v-if="errors.lastName"
            class="relative px-4 py-3 text-xs text-red-600"
          >{{ errors.lastName }}</span>
        </div>
        <div class="grid">
          <label
            class="
              text-primary-950 mb-2

              dark:text-primary-50
            "
            for="phone"
          >{{ $t('pages.account.settings.form.phone') }}</label>
          <div class="grid">
            <FormTextInput
              id="phone"
              v-model="phone"
              :bind="phoneProps"
              name="phone"
              type="text"
              :placeholder="$t('pages.account.settings.form.phone')"
              autocomplete="tel"
            />
          </div>
          <span
            v-if="errors.phone"
            class="relative px-4 py-3 text-xs text-red-600"
          >{{ errors.phone }}</span>
        </div>
        <div class="grid">
          <label
            class="
              text-primary-950 mb-2

              dark:text-primary-50
            "
            for="city"
          >{{ $t('pages.account.settings.form.city') }}</label>
          <div class="grid">
            <FormTextInput
              id="city"
              v-model="city"
              :bind="cityProps"
              name="city"
              type="text"
              :placeholder="$t('pages.account.settings.form.city')"
              autocomplete="address-level2"
            />
          </div>
          <span
            v-if="errors.city"
            class="relative px-4 py-3 text-xs text-red-600"
          >{{ errors.city }}</span>
        </div>
        <div class="grid">
          <label
            class="
              text-primary-950 mb-2

              dark:text-primary-50
            "
            for="zipcode"
          >{{ $t('pages.account.settings.form.zipcode') }}</label>
          <div class="grid">
            <FormTextInput
              id="zipcode"
              v-model="zipcode"
              :bind="zipcodeProps"
              name="zipcode"
              type="text"
              :placeholder="$t('pages.account.settings.form.zipcode')"
              autocomplete="postal-code"
            />
          </div>
          <span
            v-if="errors.zipcode"
            class="relative px-4 py-3 text-xs text-red-600"
          >{{ errors.zipcode }}</span>
        </div>
        <div class="grid">
          <label
            class="
              text-primary-950 mb-2

              dark:text-primary-50
            "
            for="address"
          >{{ $t('pages.account.settings.form.address') }}</label>
          <div class="grid">
            <FormTextInput
              id="address"
              v-model="address"
              :bind="addressProps"
              name="address"
              type="text"
              :placeholder="$t('pages.account.settings.form.address')"
              autocomplete="street-address"
            />
          </div>
          <span
            v-if="errors.address"
            class="relative px-4 py-3 text-xs text-red-600"
          >{{ errors.address }}</span>
        </div>
        <div class="grid">
          <label
            class="
              text-primary-950 mb-2

              dark:text-primary-50
            "
            for="place"
          >{{ $t('pages.account.settings.form.place') }}</label>
          <div class="grid">
            <FormTextInput
              id="place"
              v-model="place"
              :bind="placeProps"
              name="place"
              type="text"
              :placeholder="$t('pages.account.settings.form.place')"
              autocomplete="address-level3"
            />
          </div>
          <span
            v-if="errors.place"
            class="relative px-4 py-3 text-xs text-red-600"
          >{{ errors.place }}</span>
        </div>
        <div class="grid">
          <label
            class="
              text-primary-950 mb-2

              dark:text-primary-50
            "
            for="birthDate"
          >{{ $t('pages.account.settings.form.birth_date') }}</label>
          <div class="grid">
            <UPopover :popper="{ placement: 'bottom-start' }">
              <UButton
                icon="i-heroicons-calendar-days-20-solid"
                :label="label"
                color="primary"
              />
              <template #panel="{ close }">
                <DatePicker
                  v-model="birthDate"
                  @close="close"
                />
              </template>
            </UPopover>
          </div>
          <span
            v-if="errors.birthDate"
            class="relative px-4 py-3 text-xs text-red-600"
          >{{ errors.birthDate }}</span>
        </div>
        <div class="grid">
          <label
            class="
              text-primary-950 mb-2

              dark:text-primary-50
            "
            for="country"
          >{{ $t('pages.account.settings.form.country') }}</label>
          <div class="grid">
            <VeeField
              id="country"
              v-model="country"
              v-bind="countryProps"
              name="country"
              color="white"
              :as="USelect"
              :options="countryOptions"
              option-attribute="name"
              :placeholder="country === defaultSelectOptionChoose ? `${defaultSelectOptionChoose}...` : ''"
              @change.capture="onCountryChange"
            />
          </div>
          <span
            v-if="errors.country"
            class="relative px-4 py-3 text-xs text-red-600"
          >{{ errors.country }}</span>
        </div>
        <div class="grid">
          <label
            class="
              text-primary-950 mb-2

              dark:text-primary-50
            "
            for="region"
          >{{ $t('pages.account.settings.form.region') }}</label>
          <div class="grid">
            <VeeField
              id="region"
              v-model="region"
              v-bind="regionProps"
              name="region"
              color="white"
              :as="USelect"
              :options="regionOptions"
              option-attribute="name"
              :placeholder="region === defaultSelectOptionChoose ? `${defaultSelectOptionChoose}...` : ''"
            />
          </div>
          <span
            v-if="errors.region"
            class="relative px-4 py-3 text-xs text-red-600"
          >{{ errors.region }}</span>
        </div>

        <div class="col-span-2 grid items-end justify-end">
          <button
            type="submit"
            class="
              rounded bg-secondary px-4 py-2 font-bold text-primary-50

              dark:bg-secondary-dark

              disabled:cursor-not-allowed disabled:opacity-50
            "
            :disabled="submitButtonDisabled"
            :aria-busy="isSubmitting"
          >
            {{ $t('pages.account.settings.form.submit') }}
          </button>
        </div>
      </form>
    </PageBody>
  </PageWrapper>
</template>
