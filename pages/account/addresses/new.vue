<script lang="ts" setup>
import { z } from 'zod'

import {
  defaultSelectOptionChoose,
  floorChoicesList,
  locationChoicesList,
} from '~/constants'
import { FloorChoicesEnum, LocationChoicesEnum } from '~/types'
import { ZodUserAccount } from '~/types/user/account'

const { user } = useUserSession()

const { t, locale } = useI18n()
const toast = useToast()

const UTextarea = resolveComponent('UTextarea')
const USelect = resolveComponent('USelect')

const ZodUserAddress = z.object({
  title: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  street: z.string(),
  streetNumber: z.string(),
  city: z.string(),
  zipcode: z.string(),
  floor: z.union([z.nativeEnum(FloorChoicesEnum), z.string()]).nullish(),
  locationType: z
    .union([z.nativeEnum(LocationChoicesEnum), z.string()])
    .nullish(),
  phone: z.string().nullish(),
  mobilePhone: z.string().nullish(),
  notes: z.string().nullish(),
  isMain: z.boolean().nullish(),
  user: z.union([z.number(), ZodUserAccount]),
  country: z
    .string()
    .refine(value => value !== defaultSelectOptionChoose, {
      message: t('common.validation.region.required'),
    })
    .nullish(),
  region: z
    .string()
    .refine(value => value !== defaultSelectOptionChoose, {
      message: t('common.validation.region.required'),
    })
    .nullish(),
})
const validationSchema = toTypedSchema(ZodUserAddress)
const { defineField, handleSubmit, errors, isSubmitting } = useForm({
  validationSchema,
  initialValues: {
    isMain: false,
    user: user.value?.id,
    country: defaultSelectOptionChoose,
    region: defaultSelectOptionChoose,
    floor: defaultSelectOptionChoose,
    locationType: defaultSelectOptionChoose,
  },
})

const [title, titleProps] = defineField('title', {
  validateOnModelUpdate: true,
})
const [firstName, firstNameProps] = defineField('firstName', {
  validateOnModelUpdate: true,
})
const [lastName, lastNameProps] = defineField('lastName', {
  validateOnModelUpdate: true,
})
const [street, streetProps] = defineField('street', {
  validateOnModelUpdate: true,
})
const [streetNumber, streetNumberProps] = defineField('streetNumber', {
  validateOnModelUpdate: true,
})
const [city, cityProps] = defineField('city', {
  validateOnModelUpdate: true,
})
const [zipcode, zipcodeProps] = defineField('zipcode', {
  validateOnModelUpdate: true,
})
const [floor, floorProps] = defineField('floor', {
  validateOnModelUpdate: true,
})
const [locationType, locationTypeProps] = defineField('locationType', {
  validateOnModelUpdate: true,
})
const [phone, phoneProps] = defineField('phone', {
  validateOnModelUpdate: true,
})
const [mobilePhone, mobilePhoneProps] = defineField('mobilePhone', {
  validateOnModelUpdate: true,
})
const [notes, notesProps] = defineField('notes', {
  validateOnModelUpdate: true,
})
const [country, countryProps] = defineField('country', {
  validateOnModelUpdate: true,
})
const [region, regionProps] = defineField('region', {
  validateOnModelUpdate: true,
})
defineField('isMain', {
  validateOnModelUpdate: true,
})

const { data: countries } = await useLazyAsyncData('countries', () =>
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

const { data: regions } = await useLazyAsyncData(
  'regions',
  () =>
    $fetch('/api/regions', {
      method: 'GET',
      query: {
        country: country.value,
        language: locale.value,
      },
    }),
  {
    watch: [country],
    immediate: country.value !== defaultSelectOptionChoose,
  },
)

const regionOptions = computed(() => {
  return regions.value?.results?.map((region) => {
    const regionName = extractTranslated(region, 'name', locale.value)
    return {
      name: regionName,
      value: region.alpha,
    }
  }) || []
})

const onCountryChange = (event: Event) => {
  if (!(event.target instanceof HTMLSelectElement)) return
  country.value = event.target.value
  region.value = defaultSelectOptionChoose
}

const onSubmit = handleSubmit(async (values) => {
  const updatedValues = processValues(values)

  await useFetch(`/api/user/addresses`, {
    method: 'POST',
    body: {
      title: updatedValues.value.title,
      firstName: updatedValues.value.firstName,
      lastName: updatedValues.value.lastName,
      street: updatedValues.value.street,
      streetNumber: updatedValues.value.streetNumber,
      city: updatedValues.value.city,
      zipcode: updatedValues.value.zipcode,
      floor: updatedValues.value.floor,
      locationType: updatedValues.value.locationType,
      phone: updatedValues.value.phone,
      mobilePhone: updatedValues.value.mobilePhone,
      notes: updatedValues.value.notes,
      isMain: updatedValues.value.isMain,
      user: user.value?.id,
      country: updatedValues.value.country,
      region: updatedValues.value.region,
    },
    onRequestError() {
      toast.add({
        title: t('pages.account.addresses.new.error'),
        color: 'red',
      })
    },
    async onResponse({ response }) {
      if (!response.ok) {
        return
      }
      toast.add({
        title: t('pages.account.addresses.new.success'),
        color: 'green',
      })
      await navigateTo('/account/addresses')
    },
    onResponseError() {
      toast.add({
        title: t('pages.account.addresses.new.error'),
        color: 'red',
      })
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
  <PageWrapper class="grid gap-4">
    <div class="justify-items grid grid-cols-auto-1fr items-center gap-4">
      <UButton
        icon="i-heroicons-arrow-left"
        size="sm"
        :to="'/account/addresses'"
        color="primary"
        trailing
      />
      <PageTitle class="text-center">
        {{ $t('pages.account.addresses.new.title') }}
      </PageTitle>
    </div>
    <PageBody>
      <form
        id="AddressEditForm"
        class="
          bg-primary-100 flex flex-col gap-4 rounded-lg p-4

          dark:bg-primary-900

          md:grid md:grid-cols-3
        "
        name="AddressEditForm"
        @submit="onSubmit"
      >
        <div
          class="
            grid items-start

            md:content-evenly
          "
        >
          <label
            class="
              text-primary-950 mb-2

              dark:text-primary-50
            "
            for="title"
          >{{ $t('pages.account.addresses.new.form.title') }}</label>
          <div class="grid">
            <FormTextInput
              id="title"
              v-model="title"
              :bind="titleProps"
              name="title"
              type="text"
              :placeholder="$t('pages.account.addresses.new.form.title')"
              autocomplete="honorific-prefix"
              :required="true"
            />
          </div>
          <span
            v-if="errors.title"
            class="relative px-4 py-3 text-xs text-red-600"
          >{{ errors.title }}</span>
        </div>
        <div
          class="
            grid items-start

            md:content-evenly
          "
        >
          <label
            class="
              text-primary-950 mb-2

              dark:text-primary-50
            "
            for="firstName"
          >{{ $t('pages.account.addresses.new.form.first_name') }}</label>
          <div class="grid">
            <FormTextInput
              id="firstName"
              v-model="firstName"
              :bind="firstNameProps"
              name="firstName"
              type="text"
              :placeholder="$t('pages.account.addresses.new.form.first_name')"
              autocomplete="given-name"
              :required="true"
            />
          </div>
          <span
            v-if="errors.firstName"
            class="relative px-4 py-3 text-xs text-red-600"
          >{{ errors.firstName }}</span>
        </div>
        <div
          class="
            grid items-start

            md:content-evenly
          "
        >
          <label
            class="
              text-primary-950 mb-2

              dark:text-primary-50
            "
            for="lastName"
          >{{ $t('pages.account.addresses.new.form.last_name') }}</label>
          <div class="grid">
            <FormTextInput
              id="lastName"
              v-model="lastName"
              :bind="lastNameProps"
              name="lastName"
              type="text"
              :placeholder="$t('pages.account.addresses.new.form.last_name')"
              autocomplete="family-name"
              :required="true"
            />
          </div>
          <span
            v-if="errors.lastName"
            class="relative px-4 py-3 text-xs text-red-600"
          >{{ errors.lastName }}</span>
        </div>
        <div
          class="
            grid items-start

            md:content-evenly
          "
        >
          <label
            class="
              text-primary-950 mb-2

              dark:text-primary-50
            "
            for="street"
          >{{ $t('pages.account.addresses.new.form.street') }}</label>
          <div class="grid">
            <FormTextInput
              id="street"
              v-model="street"
              :bind="streetProps"
              name="street"
              type="text"
              :placeholder="$t('pages.account.addresses.new.form.street')"
              autocomplete="street-address"
              :required="true"
            />
          </div>
          <span
            v-if="errors.street"
            class="relative px-4 py-3 text-xs text-red-600"
          >{{ errors.street }}</span>
        </div>
        <div
          class="
            grid items-start

            md:content-evenly
          "
        >
          <label
            class="
              text-primary-950 mb-2

              dark:text-primary-50
            "
            for="streetNumber"
          >{{ $t('pages.account.addresses.new.form.street_number') }}</label>
          <div class="grid">
            <FormTextInput
              id="streetNumber"
              v-model="streetNumber"
              :bind="streetNumberProps"
              name="streetNumber"
              type="text"
              :placeholder="
                $t('pages.account.addresses.new.form.street_number')
              "
              autocomplete="street-address"
              :required="true"
            />
          </div>
          <span
            v-if="errors.streetNumber"
            class="relative px-4 py-3 text-xs text-red-600"
          >{{ errors.streetNumber }}</span>
        </div>
        <div
          class="
            grid items-start

            md:content-evenly
          "
        >
          <label
            class="
              text-primary-950 mb-2

              dark:text-primary-50
            "
            for="city"
          >{{ $t('pages.account.addresses.new.form.city') }}</label>
          <div class="grid">
            <FormTextInput
              id="city"
              v-model="city"
              :bind="cityProps"
              name="city"
              type="text"
              :placeholder="$t('pages.account.addresses.new.form.city')"
              autocomplete="address-level2"
              :required="true"
            />
          </div>
          <span
            v-if="errors.city"
            class="relative px-4 py-3 text-xs text-red-600"
          >{{ errors.city }}</span>
        </div>
        <div
          class="
            grid items-start

            md:content-evenly
          "
        >
          <label
            class="
              text-primary-950 mb-2

              dark:text-primary-50
            "
            for="zipcode"
          >{{ $t('pages.account.addresses.new.form.zipcode') }}</label>
          <div class="grid">
            <FormTextInput
              id="zipcode"
              v-model="zipcode"
              :bind="zipcodeProps"
              name="zipcode"
              type="text"
              :placeholder="$t('pages.account.addresses.new.form.zipcode')"
              autocomplete="postal-code"
              :required="true"
            />
          </div>
          <span
            v-if="errors.zipcode"
            class="relative px-4 py-3 text-xs text-red-600"
          >{{ errors.zipcode }}</span>
        </div>
        <div
          class="
            grid items-start

            md:content-evenly
          "
        >
          <label
            class="
              text-primary-950 mb-2

              dark:text-primary-50
            "
            for="phone"
          >{{ $t('pages.account.addresses.new.form.phone') }}</label>
          <div class="grid">
            <FormTextInput
              id="phone"
              v-model="phone"
              :bind="phoneProps"
              name="phone"
              type="text"
              :placeholder="$t('pages.account.addresses.new.form.phone')"
              autocomplete="tel"
            />
          </div>
          <span
            v-if="errors.phone"
            class="relative px-4 py-3 text-xs text-red-600"
          >{{ errors.phone }}</span>
        </div>
        <div
          class="
            grid items-start

            md:content-evenly
          "
        >
          <label
            class="
              text-primary-950 mb-2

              dark:text-primary-50
            "
            for="mobilePhone"
          >{{ $t('pages.account.addresses.new.form.mobile_phone') }}</label>
          <div class="grid">
            <FormTextInput
              id="mobilePhone"
              v-model="mobilePhone"
              :bind="mobilePhoneProps"
              name="mobilePhone"
              type="text"
              :placeholder="$t('pages.account.addresses.new.form.mobile_phone')"
              autocomplete="tel"
            />
          </div>
          <span
            v-if="errors.mobilePhone"
            class="relative px-4 py-3 text-xs text-red-600"
          >{{ errors.mobilePhone }}</span>
        </div>

        <div
          class="
            grid items-start gap-2

            md:content-evenly
          "
        >
          <div class="grid">
            <label
              class="
                text-primary-950 mb-2

                dark:text-primary-50
              "
              for="floor"
            >{{ $t('pages.account.addresses.new.form.floor') }}</label>
            <VeeField
              id="floor"
              v-model="floor"
              :bind="floorProps"
              name="floor"
              color="white"
              :as="USelect"
              :options="floorChoicesList"
              :placeholder="floor === defaultSelectOptionChoose ? `${defaultSelectOptionChoose}...` : ''"
            />
            <span
              v-if="errors.floor"
              class="relative px-4 py-3 text-xs text-red-600"
            >{{ errors.floor }}</span>
          </div>
          <div class="grid">
            <label
              class="
                text-primary-950 mb-2

                dark:text-primary-50
              "
              for="locationType"
            >{{ $t('pages.account.addresses.new.form.location_type') }}</label>
            <VeeField
              id="locationType"
              v-model="locationType"
              v-bind="locationTypeProps"
              name="locationType"
              color="white"
              :as="USelect"
              :options="locationChoicesList"
              :placeholder="locationType === defaultSelectOptionChoose ? `${defaultSelectOptionChoose}...` : ''"
            />
            <span
              v-if="errors.locationType"
              class="relative px-4 py-3 text-xs text-red-600"
            >{{ errors.locationType }}</span>
          </div>
        </div>

        <div
          class="
            grid items-start gap-2

            md:content-evenly
          "
        >
          <div class="grid">
            <label
              class="
                text-primary-950 mb-2

                dark:text-primary-50
              "
              for="country"
            >{{ $t('pages.account.addresses.new.form.country') }}</label>
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
            >{{ $t('pages.account.addresses.new.form.region') }}</label>
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
        </div>

        <div
          class="
            grid items-start

            md:content-evenly
          "
        >
          <label
            class="
              text-primary-950 mb-2

              dark:text-primary-50
            "
            for="notes"
          >{{ $t('pages.account.addresses.new.form.notes') }}</label>
          <div class="grid">
            <VeeField
              id="notes"
              v-model="notes"
              v-bind="notesProps"
              :as="UTextarea"
              name="notes"
              color="primary"
              type="text"
              :rows="4"
              :placeholder="$t('pages.account.addresses.new.form.notes')"
            />
          </div>
        </div>

        <div class="col-start-3 grid items-end justify-end">
          <button
            type="submit"
            class="
              rounded bg-secondary px-4 py-2 font-bold text-white

              dark:bg-secondary-dark

              disabled:cursor-not-allowed disabled:opacity-50
            "
            :disabled="submitButtonDisabled"
            :aria-busy="isSubmitting"
          >
            {{ $t('pages.account.addresses.new.form.submit') }}
          </button>
        </div>
      </form>
    </PageBody>
  </PageWrapper>
</template>
