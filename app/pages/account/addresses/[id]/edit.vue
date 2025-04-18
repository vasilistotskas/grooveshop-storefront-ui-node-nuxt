<script lang="ts" setup>
import * as z from 'zod'

import { Field, useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'

const { t, locale } = useI18n({ useScope: 'local' })
const toast = useToast()
const route = useRoute()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const addressId = 'id' in route.params
  ? route.params.id
  : undefined
const regions = ref<Pagination<Region> | null>(null)

const UTextarea = resolveComponent('UTextarea')
const USelect = resolveComponent('USelect')

const { data: address } = await useFetch<UserAddress>(`/api/user/addresses/${addressId}`, {
  key: `address${addressId}`,
  method: 'GET',
  headers: useRequestHeaders(),
  query: {
    language: locale,
  },
})

const ZodUserAddress = z.object({
  title: z.string({ required_error: $i18n.t('validation.required') }),
  firstName: z.string({ required_error: $i18n.t('validation.required') }),
  lastName: z.string({ required_error: $i18n.t('validation.required') }),
  street: z.string({ required_error: $i18n.t('validation.required') }),
  streetNumber: z.string({ required_error: $i18n.t('validation.required') }),
  city: z.string({ required_error: $i18n.t('validation.required') }),
  zipcode: z.string({ required_error: $i18n.t('validation.required') }),
  floor: z.union([z.nativeEnum(FloorChoicesEnum), z.string({ required_error: $i18n.t('validation.required') })]).optional(),
  locationType: z
    .union([z.nativeEnum(LocationChoicesEnum), z.string({ required_error: $i18n.t('validation.required') })])
    .optional(),
  phone: z.string({ required_error: $i18n.t('validation.required') }).optional(),
  mobilePhone: z.string({ required_error: $i18n.t('validation.required') }).optional(),
  notes: z.string({ required_error: $i18n.t('validation.required') }).optional(),
  isMain: z.boolean().optional(),
  user: z.union([z.number(), ZodUserAccount]),
  country: z.string({ required_error: $i18n.t('validation.required') }).optional(),
  region: z.string({ required_error: $i18n.t('validation.required') }).optional(),
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

const { data: countries } = await useFetch<Pagination<Country>>(
  '/api/countries',
  {
    key: 'countries',
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      language: locale,
    },
  },
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
    regions.value = await $fetch<Pagination<Region>>('/api/regions', {
      method: 'GET',
      query: {
        country: country.value,
        language: locale.value,
      },
    })
  }
  catch {
    toast.add({
      title: $i18n.t('error.default'),
      description: t('error_occurred'),
      color: 'error',
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

  await $fetch<UserAddress>(`/api/user/addresses/${addressId}`, {
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
        title: t('success'),
        color: 'success',
      })
      await navigateTo(localePath('account-addresses'))
    },
    onResponseError() {
      toast.add({
        title: t('error'),
        color: 'error',
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
        title: t('main.success'),
        color: 'success',
      })
      await navigateTo(localePath('account-addresses'))
    },
    onResponseError() {
      toast.add({
        title: t('main.error'),
        color: 'error',
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
        'flex items-center justify-items-end gap-4',
        { main: address?.isMain },
      ]"
    >
      <div class="flex items-center gap-4">
        <UButton
          :to="localePath('account-addresses')"
          :trailing="true"
          color="neutral"
          icon="i-heroicons-arrow-left"
          size="sm"
        >
          <span class="sr-only">{{
            t('back')
          }}</span>
        </UButton>
        <PageTitle
          :text="`${t('title')} ${address?.id}`"
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
          {{ t('main.title') }}
        </span>
      </div>
      <UButton
        v-else
        :label="t('main.button')"
        :trailing="true"
        class="gap-4"
        color="neutral"
        icon="i-heroicons-check-circle"
        @click="onSetMain"
      />
    </div>

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
        >{{ t('form.title') }}</label>
        <div class="grid">
          <FormTextInput
            id="title"
            v-model="title"
            :bind="titleProps"
            :placeholder="t('form.title')"
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
        >{{ t('form.first_name') }}</label>
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
        >{{ t('form.last_name') }}</label>
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
        >{{ t('form.street') }}</label>
        <div class="grid">
          <FormTextInput
            id="street"
            v-model="street"
            :bind="streetProps"
            :placeholder="t('form.street')"
            :required="true"
            autocomplete="address-line1"
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
        >{{ t('form.street_number') }}</label>
        <div class="grid">
          <FormTextInput
            id="streetNumber"
            v-model="streetNumber"
            :bind="streetNumberProps"
            :placeholder="
              t('form.street_number')
            "
            :required="true"
            autocomplete="address-line2"
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
        >{{ t('form.city') }}</label>
        <div class="grid">
          <FormTextInput
            id="city"
            v-model="city"
            :bind="cityProps"
            :placeholder="t('form.city')"
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
        >{{ t('form.zipcode') }}</label>
        <div class="grid">
          <FormTextInput
            id="zipcode"
            v-model="zipcode"
            :bind="zipcodeProps"
            :placeholder="t('form.zipcode')"
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
        >{{ t('form.phone') }}</label>
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
        >{{ t('form.mobile_phone') }}</label>
        <div class="grid">
          <FormTextInput
            id="mobilePhone"
            v-model="mobilePhone"
            :bind="mobilePhoneProps"
            :placeholder="
              t('form.mobile_phone')
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
          >{{ t('form.floor') }}</label>
          <Field
            id="floor"
            v-model="floor"
            :as="USelect"
            :bind="floorProps"
            :options="floorChoicesList"
            :placeholder="floor === defaultSelectOptionChoose ? `${defaultSelectOptionChoose}...` : ''"
            color="neutral"
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
            t('form.location_type')
          }}</label>
          <Field
            id="locationType"
            v-model="locationType"
            :as="USelect"
            :options="locationChoicesList"
            :placeholder="locationType === defaultSelectOptionChoose ? `${defaultSelectOptionChoose}...` : ''"
            color="neutral"
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
          >{{ t('form.country') }}</label>
          <div class="grid">
            <Field
              id="country"
              v-model="country"
              :as="USelect"
              :options="countryOptions"
              :placeholder="country === defaultSelectOptionChoose ? `${defaultSelectOptionChoose}...` : ''"
              color="neutral"
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
          >{{ t('form.region') }}</label>
          <div class="grid">
            <Field
              id="region"
              v-model="region"
              :as="USelect"
              :options="regionOptions"
              :placeholder="region === defaultSelectOptionChoose ? `${defaultSelectOptionChoose}...` : ''"
              color="neutral"
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
        >{{ t('form.notes') }}</label>
        <div class="grid">
          <Field
            id="notes"
            v-model="notes"
            :as="UTextarea"
            :placeholder="t('form.notes')"
            :rows="4"
            color="neutral"
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
              text-primary-50 rounded bg-secondary px-4 py-2 font-bold

              disabled:cursor-not-allowed disabled:opacity-50
            "
          type="submit"
        >
          {{ t('form.update') }}
        </button>
      </div>
    </form>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Επεξεργασία διεύθυνσης
  error: Σφάλμα ενημέρωσης διεύθυνσης
  success: Η διεύθυνση ενημερώθηκε με επιτυχία
  back: Επιστροφή στις διευθύνσεις
  main:
    title: Κύριος
    success: Η κύρια διεύθυνση ενημερώθηκε με επιτυχία
    error: Σφάλμα ενημέρωσης κύριας διεύθυνσης
    button: Ορισμός ως κύρια διεύθυνση
  form:
    title: Διεύθυνση
    first_name: Όνομα
    last_name: Επίθετο
    street: Δρόμος
    street_number: Αριθμός δρόμου
    city: Πόλη
    zipcode: Ταχυδρομικός Κώδικας
    phone: Τηλέφωνο
    mobile_phone: Κινητό τηλέφωνο
    notes: Σημειώσεις
    floor: Πάτωμα
    location_type: Τύπος τοποθεσίας
    country: Χώρα
    region: Περιφέρεια
    submit: Αποθήκευση
    update: Ενημέρωση
  validation:
    title:
      min: Ο τίτλος πρέπει να αποτελείται από τουλάχιστον {min} χαρακτήρες
    first_name:
      min: Το όνομα πρέπει να είναι τουλάχιστον {min} χαρακτήρες
    last_name:
      min: Το επώνυμο πρέπει να είναι τουλάχιστον {min} χαρακτήρες
    street:
      min: Η οδός πρέπει να έχει τουλάχιστον {min} χαρακτήρες
    street_number:
      min: Ο αριθμός οδού πρέπει να είναι τουλάχιστον {min} χαρακτήρες
    city:
      min: Η πόλη πρέπει να έχει τουλάχιστον {min} χαρακτήρες
    zipcode:
      min: Ο ταχυδρομικός κώδικας πρέπει να είναι τουλάχιστον {min} χαρακτήρες
    region:
      required: Απαιτείται Περιφέρεια
</i18n>
