<script lang="ts" setup>
import type * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const { user } = useUserSession()
const localePath = useLocalePath()
const { t, locale } = useI18n()
const toast = useToast()

// Use auto-generated Zod schema
const schema = zUserAddressWriteRequest

type Schema = z.output<typeof schema>

// Form state
const state = reactive<Partial<Schema>>({
  title: undefined,
  firstName: undefined,
  lastName: undefined,
  street: undefined,
  streetNumber: undefined,
  city: undefined,
  zipcode: undefined,
  phone: undefined,
  notes: undefined,
  isMain: false,
  country: undefined,
  region: undefined,
  floor: undefined,
  locationType: undefined,
  user: user.value?.id,
})

// Countries data
const { data: countries } = await useFetch('/api/countries', {
  key: 'countries',
  method: 'GET',
  headers: useRequestHeaders(),
  query: {
    languageCode: locale,
  },
})

const countryOptions = computed(() => {
  return (
    countries.value?.results?.map(country => ({
      label: extractTranslated(country, 'name', locale.value),
      value: country.alpha2,
    })) || []
  )
})

// Regions data
const { data: regions, execute: fetchRegions } = await useFetch<Pagination<Region>>(
  '/api/regions',
  {
    immediate: false,
    query: computed(() => ({
      country: state.country,
      languageCode: locale.value,
    })),
  },
)

const regionOptions = computed(() => {
  return (
    regions.value?.results?.map(region => ({
      label: extractTranslated(region, 'name', locale.value),
      value: region.alpha,
    })) || []
  )
})

// Floor options
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

// Location type options
const locationTypeOptions = computed(() => [
  { label: t('form.location_type_options.HOME'), value: 'HOME' },
  { label: t('form.location_type_options.OFFICE'), value: 'OFFICE' },
  { label: t('form.location_type_options.OTHER'), value: 'OTHER' },
])

// Watch country changes to fetch regions
watch(
  () => state.country,
  async (newCountry) => {
    if (newCountry) {
      state.region = undefined
      await fetchRegions()
    }
  },
)

// Form submission
async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    await $fetch('/api/user/addresses', {
      method: 'POST',
      headers: useRequestHeaders(),
      body: event.data,
    })

    toast.add({
      title: t('success'),
      color: 'success',
    })

    await navigateTo(localePath('account-addresses'))
  }
  catch {
    toast.add({
      title: t('error'),
      color: 'error',
    })
  }
}

defineRouteRules({
  robots: false,
})

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper class="flex flex-col gap-4 md:mt-1 md:gap-8 md:p-0!">
    <div class="flex items-center gap-4">
      <UButton
        :to="localePath('account-addresses')"
        color="neutral"
        variant="outline"
        icon="i-heroicons-arrow-left"
        size="sm"
        trailing
      />
      <PageTitle class="text-center md:mt-0">
        {{ t('title') }}
      </PageTitle>
    </div>

    <UCard>
      <UForm :schema="schema" :state="state" class="grid gap-4 md:grid-cols-2" @submit="onSubmit">
        <!-- Title -->
        <UFormField :label="t('form.title')" name="title" required>
          <UInput
            v-model="state.title"
            :placeholder="t('form.title')"
            autocomplete="honorific-prefix"
          />
        </UFormField>

        <!-- First Name -->
        <UFormField :label="t('form.first_name')" name="firstName" required>
          <UInput
            v-model="state.firstName"
            :placeholder="t('form.first_name')"
            autocomplete="given-name"
          />
        </UFormField>

        <!-- Last Name -->
        <UFormField :label="t('form.last_name')" name="lastName" required>
          <UInput
            v-model="state.lastName"
            :placeholder="t('form.last_name')"
            autocomplete="family-name"
          />
        </UFormField>

        <!-- Street -->
        <UFormField :label="t('form.street')" name="street" required>
          <UInput
            v-model="state.street"
            :placeholder="t('form.street')"
            autocomplete="address-line1"
          />
        </UFormField>

        <!-- Street Number -->
        <UFormField :label="t('form.street_number')" name="streetNumber" required>
          <UInput
            v-model="state.streetNumber"
            :placeholder="t('form.street_number')"
            autocomplete="address-line1"
          />
        </UFormField>

        <!-- City -->
        <UFormField :label="t('form.city')" name="city" required>
          <UInput
            v-model="state.city"
            :placeholder="t('form.city')"
            autocomplete="address-level2"
          />
        </UFormField>

        <!-- Zipcode -->
        <UFormField :label="t('form.zipcode')" name="zipcode" required>
          <UInput
            v-model="state.zipcode"
            :placeholder="t('form.zipcode')"
            autocomplete="postal-code"
          />
        </UFormField>

        <!-- Phone -->
        <UFormField :label="t('form.phone')" name="phone" required>
          <UInput
            v-model="state.phone"
            :placeholder="t('form.phone')"
            autocomplete="tel"
          />
        </UFormField>

        <!-- Country -->
        <UFormField :label="t('form.country')" name="country" required>
          <USelectMenu
            v-model="state.country"
            :items="countryOptions"
            :placeholder="t('form.select_placeholder')"
            value-key="value"
            autocomplete="country"
          />
        </UFormField>

        <!-- Region -->
        <UFormField :label="t('form.region')" name="region" required>
          <USelectMenu
            v-model="state.region"
            :items="regionOptions"
            :placeholder="t('form.select_placeholder')"
            :disabled="!state.country"
            value-key="value"
            autocomplete="address-level1"
          />
        </UFormField>

        <!-- Floor -->
        <UFormField :label="t('form.floor')" name="floor">
          <USelectMenu
            v-model="state.floor"
            :items="floorOptions"
            :placeholder="t('form.select_placeholder')"
            value-key="value"
            clear
          />
        </UFormField>

        <!-- Location Type -->
        <UFormField :label="t('form.location_type')" name="locationType">
          <USelectMenu
            v-model="state.locationType"
            :items="locationTypeOptions"
            :placeholder="t('form.select_placeholder')"
            value-key="value"
            clear
          />
        </UFormField>

        <!-- Notes -->
        <UFormField :label="t('form.notes')" name="notes" class="md:col-span-2">
          <UTextarea
            v-model="state.notes"
            :placeholder="t('form.notes')"
            :rows="3"
          />
        </UFormField>

        <!-- Submit Button -->
        <div class="md:col-span-2">
          <UButton type="submit" color="success" block>
            {{ t('form.submit') }}
          </UButton>
        </div>
      </UForm>
    </UCard>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Νέα διεύθυνση
  error: Σφάλμα δημιουργίας διεύθυνσης
  success: Η διεύθυνση δημιουργήθηκε με επιτυχία
  form:
    select_placeholder: Επέλεξε
    title: Διεύθυνση
    first_name: Όνομα
    last_name: Επίθετο
    street: Δρόμος
    street_number: Αριθμός δρόμου
    city: Πόλη
    zipcode: Ταχυδρομικός Κώδικας
    phone: Τηλέφωνο
    notes: Σημειώσεις
    floor: Όροφος
    floor_options:
      BASEMENT: Υπόγειο
      GROUND_FLOOR: Ισόγειο
      FIRST_FLOOR: 1ος Όροφος
      SECOND_FLOOR: 2ος Όροφος
      THIRD_FLOOR: 3ος Όροφος
      FOURTH_FLOOR: 4ος Όροφος
      FIFTH_FLOOR: 5ος Όροφος
      SIXTH_FLOOR_PLUS: 6ος+ Όροφος
    location_type: Τοποθεσία
    location_type_options:
      HOME: Κατοικία
      OFFICE: Γραφείο
      OTHER: Άλλο
    country: Χώρα
    region: Περιφέρεια
    submit: Αποθήκευση
</i18n>
