<script lang="ts" setup>
import { z } from 'zod'

import {
  defaultSelectOptionChoose,
  floorChoicesList,
  locationChoicesList,
} from '~/constants'
import { FloorChoicesEnum, LocationChoicesEnum } from '~/types'
import { ZodUserAccount } from '~/types/user/account'

const { t, locale } = useI18n()
const toast = useToast()
const route = useRoute()

const addressId = Number(route.params.id)

const UTextarea = resolveComponent('UTextarea')
const USelect = resolveComponent('USelect')

const { data: address } = await useFetch(`/api/user/addresses/${addressId}`, {
  key: `address${addressId}`,
  method: 'GET',
  query: {
    language: locale.value,
  },
})

const ZodUserAddress = z.object({
  title: z.string({ required_error: t('common.validation.required') }),
  firstName: z.string({ required_error: t('common.validation.required') }),
  lastName: z.string({ required_error: t('common.validation.required') }),
  street: z.string({ required_error: t('common.validation.required') }),
  streetNumber: z.string({ required_error: t('common.validation.required') }),
  city: z.string({ required_error: t('common.validation.required') }),
  zipcode: z.string({ required_error: t('common.validation.required') }),
  floor: z.union([z.nativeEnum(FloorChoicesEnum), z.string({ required_error: t('common.validation.required') })]).nullish(),
  locationType: z
    .union([z.nativeEnum(LocationChoicesEnum), z.string({ required_error: t('common.validation.required') })])
    .nullish(),
  phone: z.string({ required_error: t('common.validation.required') }).nullish(),
  mobilePhone: z.string({ required_error: t('common.validation.required') }).nullish(),
  notes: z.string({ required_error: t('common.validation.required') }).nullish(),
  isMain: z.boolean().nullish(),
  user: z.union([z.number(), ZodUserAccount]),
  country: z.string({ required_error: t('common.validation.required') }).nullish(),
  region: z.string({ required_error: t('common.validation.required') }).nullish(),
})
const validationSchema = toTypedSchema(ZodUserAddress)
const initialValues = ZodUserAddress.parse({
  title: address.value?.title || '',
  firstName: address.value?.firstName || '',
  lastName: address.value?.lastName || '',
  street: address.value?.street || '',
  streetNumber: address.value?.streetNumber || '',
  city: address.value?.city || '',
  zipcode: address.value?.zipcode || '',
  floor: address.value?.floor || defaultSelectOptionChoose,
  locationType: address.value?.locationType || defaultSelectOptionChoose,
  phone: address.value?.phone || '',
  mobilePhone: address.value?.mobilePhone || '',
  notes: address.value?.notes || '',
  isMain: address.value?.isMain || false,
  user: address.value?.user || null,
  country: address.value?.country || defaultSelectOptionChoose,
  region: address.value?.region || defaultSelectOptionChoose,
})
const { defineField, handleSubmit, errors, isSubmitting } = useForm({
  validationSchema,
  initialValues,
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

const { data: regions } = await useAsyncData(
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

  await useFetch(`/api/user/addresses/${addressId}`, {
    method: 'PUT',
    body: {
      title: updatedValues.title,
      firstName: updatedValues.firstName,
      lastName: updatedValues.lastName,
      street: updatedValues.street,
      streetNumber: updatedValues.streetNumber,
      city: updatedValues.city,
      zipcode: updatedValues.zipcode,
      floor: Number(updatedValues.floor),
      locationType: Number(updatedValues.locationType),
      phone: updatedValues.phone,
      mobilePhone: updatedValues.mobilePhone,
      notes: updatedValues.notes,
      isMain: updatedValues.isMain,
      user: updatedValues.user,
      country: updatedValues.country,
      region: updatedValues.region,
    },
    onRequestError() {
      toast.add({
        title: t('pages.account.addresses.edit.error'),
        color: 'red',
      })
    },
    async onResponse({ response }) {
      if (!response.ok) {
        return
      }
      toast.add({
        title: t('pages.account.addresses.edit.success'),
        color: 'green',
      })
      await navigateTo('/account/addresses')
    },
    onResponseError() {
      toast.add({
        title: t('pages.account.addresses.edit.error'),
        color: 'red',
      })
    },
  })
})

const onSetMain = async () => {
  await useFetch(`/api/user/addresses/${addressId}/set-main`, {
    method: 'POST',
    onRequestError() {
      toast.add({
        title: t('pages.account.addresses.edit.main.error'),
        color: 'red',
      })
    },
    async onResponse({ response }) {
      if (!response.ok) {
        return
      }
      toast.add({
        title: t('pages.account.addresses.edit.main.success'),
        color: 'green',
      })
      await navigateTo('/account/addresses')
    },
    onResponseError() {
      toast.add({
        title: t('pages.account.addresses.edit.main.error'),
        color: 'red',
      })
    },
  })
}

const submitButtonDisabled = computed(() => {
  return isSubmitting.value || Object.keys(errors.value).length > 0
})

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper class="grid gap-4">
    <div
      :class="[
        'grid grid-cols-auto-1fr items-center justify-items-end gap-4',
        { main: address?.isMain },
      ]"
    >
      <div class="grid grid-cols-auto-1fr items-center gap-4">
        <UButton
          icon="i-heroicons-arrow-left"
          size="sm"
          :to="'/account/addresses'"
          :trailing="true"
          color="primary"
        >
          <span class="sr-only">{{
            $t('pages.account.addresses.edit.back')
          }}</span>
        </UButton>
        <PageTitle
          :text="`${$t('pages.account.addresses.edit.title')} ${address?.id}`"
        />
      </div>
      <div v-if="address?.isMain" class="flex items-center">
        <span
          class="
            mr-2 text-green-500

            dark:text-green-400
          "
        >
          <IconFa6Solid:circleCheck />
        </span>
        <span
          class="
            text-green-500

            dark:text-green-400
          "
        >
          {{ $t('pages.account.addresses.edit.main.title') }}
        </span>
      </div>
      <UButton
        v-else
        icon="i-heroicons-check-circle"
        :label="$t('pages.account.addresses.edit.main.button')"
        class="gap-4"
        :trailing="true"
        color="primary"
        @click="onSetMain"
      />
    </div>
    <PageBody>
      <form
        v-if="address"
        id="AddressEditForm"
        class="
          bg-primary-100 flex flex-col gap-4 rounded-lg p-4

          dark:bg-primary-900

          md:grid md:grid-cols-3
        "
        name="AddressEditForm"
        :action="`/api/v1/user/addresses/${address.id}`"
        method="post"
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
          >{{ $t('pages.account.addresses.edit.form.title') }}</label>
          <div class="grid">
            <FormTextInput
              id="title"
              v-model="title"
              :bind="titleProps"
              class="
                text-primary-950 mb-2

                dark:text-primary-50
              "
              name="title"
              type="text"
              :placeholder="$t('pages.account.addresses.edit.form.title')"
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
          >{{ $t('pages.account.addresses.edit.form.first_name') }}</label>
          <div class="grid">
            <FormTextInput
              id="firstName"
              v-model="firstName"
              :bind="firstNameProps"
              name="firstName"
              type="text"
              :placeholder="$t('pages.account.addresses.edit.form.first_name')"
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
          >{{ $t('pages.account.addresses.edit.form.last_name') }}</label>
          <div class="grid">
            <FormTextInput
              id="lastName"
              v-model="lastName"
              :bind="lastNameProps"
              name="lastName"
              type="text"
              :placeholder="$t('pages.account.addresses.edit.form.last_name')"
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
          >{{ $t('pages.account.addresses.edit.form.street') }}</label>
          <div class="grid">
            <FormTextInput
              id="street"
              v-model="street"
              :bind="streetProps"
              name="street"
              type="text"
              :placeholder="$t('pages.account.addresses.edit.form.street')"
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
          >{{ $t('pages.account.addresses.edit.form.street_number') }}</label>
          <div class="grid">
            <FormTextInput
              id="streetNumber"
              v-model="streetNumber"
              :bind="streetNumberProps"
              name="streetNumber"
              type="text"
              :placeholder="
                $t('pages.account.addresses.edit.form.street_number')
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
          >{{ $t('pages.account.addresses.edit.form.city') }}</label>
          <div class="grid">
            <FormTextInput
              id="city"
              v-model="city"
              :bind="cityProps"
              name="city"
              type="text"
              :placeholder="$t('pages.account.addresses.edit.form.city')"
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
          >{{ $t('pages.account.addresses.edit.form.zipcode') }}</label>
          <div class="grid">
            <FormTextInput
              id="zipcode"
              v-model="zipcode"
              :bind="zipcodeProps"
              name="zipcode"
              type="text"
              :placeholder="$t('pages.account.addresses.edit.form.zipcode')"
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
          >{{ $t('pages.account.addresses.edit.form.phone') }}</label>
          <div class="grid">
            <FormTextInput
              id="phone"
              v-model="phone"
              :bind="phoneProps"
              name="phone"
              type="text"
              :placeholder="$t('pages.account.addresses.edit.form.phone')"
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
          >{{ $t('pages.account.addresses.edit.form.mobile_phone') }}</label>
          <div class="grid">
            <FormTextInput
              id="mobilePhone"
              v-model="mobilePhone"
              :bind="mobilePhoneProps"
              name="mobilePhone"
              type="text"
              :placeholder="
                $t('pages.account.addresses.edit.form.mobile_phone')
              "
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
            >{{ $t('pages.account.addresses.edit.form.floor') }}</label>
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
            >{{
              $t('pages.account.addresses.edit.form.location_type')
            }}</label>
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
            >{{ $t('pages.account.addresses.edit.form.country') }}</label>
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
            >{{ $t('pages.account.addresses.edit.form.region') }}</label>
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
          >{{ $t('pages.account.addresses.edit.form.notes') }}</label>
          <div class="grid">
            <VeeField
              id="notes"
              v-model="notes"
              :as="UTextarea"
              v-bind="notesProps"
              name="notes"
              color="primary"
              type="text"
              :rows="4"
              :placeholder="$t('pages.account.addresses.edit.form.notes')"
            />
          </div>
        </div>

        <div class="col-span-2 col-start-3 grid items-end justify-end">
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
            {{ $t('pages.account.addresses.edit.form.update') }}
          </button>
        </div>
      </form>
    </PageBody>
  </PageWrapper>
</template>
