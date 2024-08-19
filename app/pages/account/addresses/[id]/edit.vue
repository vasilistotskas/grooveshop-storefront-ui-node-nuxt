<script lang="ts" setup>
import { z } from 'zod'

import { defaultSelectOptionChoose, floorChoicesList, locationChoicesList } from '~/constants'
import { FloorChoicesEnum, LocationChoicesEnum } from '~/types'
import { ZodUserAccount } from '~/types/user/account'
import type { Pagination } from '~/types/pagination'
import type { Region } from '~/types/region'

const { t, locale } = useI18n()
const toast = useToast()
const route = useRoute()
const localePath = useLocalePath()

const addressId = Number(route.params.id)
const regions = ref<Pagination<Region> | null>(null)

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
  floor: z.union([z.nativeEnum(FloorChoicesEnum), z.string({ required_error: t('common.validation.required') })]).optional(),
  locationType: z
    .union([z.nativeEnum(LocationChoicesEnum), z.string({ required_error: t('common.validation.required') })])
    .optional(),
  phone: z.string({ required_error: t('common.validation.required') }).optional(),
  mobilePhone: z.string({ required_error: t('common.validation.required') }).optional(),
  notes: z.string({ required_error: t('common.validation.required') }).optional(),
  isMain: z.boolean().optional(),
  user: z.union([z.number(), ZodUserAccount]),
  country: z.string({ required_error: t('common.validation.required') }).optional(),
  region: z.string({ required_error: t('common.validation.required') }).optional(),
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
  catch {
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

const onCountryChange = async (event: Event) => {
  if (!(event.target instanceof HTMLSelectElement)) return
  country.value = event.target.value
  region.value = defaultSelectOptionChoose
  await fetchRegions()
}

const onSubmit = handleSubmit(async (values) => {
  const updatedValues = processValues(values)

  await $fetch(`/api/user/addresses/${addressId}`, {
    method: 'PUT',
    headers: useRequestHeaders(),
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
    async onResponse({ response }) {
      if (!response.ok) {
        return
      }
      toast.add({
        title: t('pages.account.addresses.edit.success'),
        color: 'green',
      })
      await navigateTo(localePath('/account/addresses'))
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
  await $fetch(`/api/user/addresses/${addressId}/set-main`, {
    method: 'POST',
    headers: useRequestHeaders(),
    async onResponse({ response }) {
      if (!response.ok) {
        return
      }
      toast.add({
        title: t('pages.account.addresses.edit.main.success'),
        color: 'green',
      })
      await navigateTo(localePath('/account/addresses'))
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
          :to="localePath('/account/addresses')"
          :trailing="true"
          color="primary"
          icon="i-heroicons-arrow-left"
          size="sm"
        >
          <span class="sr-only">{{
            $t('pages.account.addresses.edit.back')
          }}</span>
        </UButton>
        <PageTitle
          :text="`${$t('pages.account.addresses.edit.title')} ${address?.id}`"
        />
      </div>
      <div
        v-if="address?.isMain"
        class="flex items-center"
      >
        <span
          class="
            mr-2 text-green-500

            dark:text-green-400
          "
        >
          <UIcon name="i-fa6-circle-check" />
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
        :label="$t('pages.account.addresses.edit.main.button')"
        :trailing="true"
        class="gap-4"
        color="primary"
        icon="i-heroicons-check-circle"
        @click="onSetMain"
      />
    </div>
    <PageBody>
      <form
        v-if="address"
        id="AddressEditForm"
        :action="`/api/v1/user/addresses/${address.id}`"
        class="
          bg-primary-100 flex flex-col gap-4 rounded-lg p-4

          dark:bg-primary-900

          md:grid md:grid-cols-3
        "
        method="post"
        name="AddressEditForm"
        @submit="onSubmit"
      >
        <div
          class="
            grid items-start

            md:content-start
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
              :placeholder="$t('pages.account.addresses.edit.form.title')"
              :required="true"
              autocomplete="honorific-prefix"
              class="
                text-primary-950 mb-2

                dark:text-primary-50
              "
              name="title"
              type="text"
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

            md:content-start
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
              :placeholder="$t('pages.account.addresses.edit.form.first_name')"
              :required="true"
              autocomplete="given-name"
              name="firstName"
              type="text"
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

            md:content-start
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
              :placeholder="$t('pages.account.addresses.edit.form.last_name')"
              :required="true"
              autocomplete="family-name"
              name="lastName"
              type="text"
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

            md:content-start
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
              :placeholder="$t('pages.account.addresses.edit.form.street')"
              :required="true"
              autocomplete="street-address"
              name="street"
              type="text"
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

            md:content-start
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
              :placeholder="
                $t('pages.account.addresses.edit.form.street_number')
              "
              :required="true"
              autocomplete="street-address"
              name="streetNumber"
              type="text"
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

            md:content-start
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
              :placeholder="$t('pages.account.addresses.edit.form.city')"
              :required="true"
              autocomplete="address-level2"
              name="city"
              type="text"
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

            md:content-start
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
              :placeholder="$t('pages.account.addresses.edit.form.zipcode')"
              :required="true"
              autocomplete="postal-code"
              name="zipcode"
              type="text"
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

            md:content-start
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
              :placeholder="$t('pages.account.addresses.edit.form.phone')"
              autocomplete="tel"
              name="phone"
              type="text"
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

            md:content-start
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
              :placeholder="
                $t('pages.account.addresses.edit.form.mobile_phone')
              "
              autocomplete="tel"
              name="mobilePhone"
              type="text"
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

            md:content-start
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
              :as="USelect"
              :bind="floorProps"
              :options="floorChoicesList"
              :placeholder="floor === defaultSelectOptionChoose ? `${defaultSelectOptionChoose}...` : ''"
              color="white"
              name="floor"
              option-attribute="name"
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
              :as="USelect"
              :options="locationChoicesList"
              :placeholder="locationType === defaultSelectOptionChoose ? `${defaultSelectOptionChoose}...` : ''"
              color="white"
              name="locationType"
              option-attribute="name"
              v-bind="locationTypeProps"
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

            md:content-start
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
                :as="USelect"
                :options="countryOptions"
                :placeholder="country === defaultSelectOptionChoose ? `${defaultSelectOptionChoose}...` : ''"
                color="white"
                name="country"
                option-attribute="name"
                v-bind="countryProps"
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
                :as="USelect"
                :options="regionOptions"
                :placeholder="region === defaultSelectOptionChoose ? `${defaultSelectOptionChoose}...` : ''"
                color="white"
                name="region"
                option-attribute="name"
                v-bind="regionProps"
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

            md:content-start
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
              :placeholder="$t('pages.account.addresses.edit.form.notes')"
              :rows="4"
              color="primary"
              name="notes"
              type="text"
              v-bind="notesProps"
            />
          </div>
        </div>

        <div class="col-span-2 col-start-3 grid items-end justify-end">
          <button
            :aria-busy="isSubmitting"
            :disabled="submitButtonDisabled"
            class="
              rounded bg-secondary px-4 py-2 font-bold text-primary-50

              dark:bg-secondary-dark

              disabled:cursor-not-allowed disabled:opacity-50
            "
            type="submit"
          >
            {{ $t('pages.account.addresses.edit.form.update') }}
          </button>
        </div>
      </form>
    </PageBody>
  </PageWrapper>
</template>
