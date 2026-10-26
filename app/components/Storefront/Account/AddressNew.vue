<script lang="ts" setup>
const localePath = useLocalePath()
const { t } = useI18n()
// Every account route rendered with the document title left at the
// store name, twice — 46 pages whose browser tab and history entry were
// indistinguishable. The `title` string was already here and simply
// never applied.
useHead({ title: () => t('title') })

const form = useTemplateRef('form')

const {
  schema,
  state,
  isSubmitting,
  phonePick,
  selectedCountry,
  countryOptions,
  shippableCountryCodes,
  regionOptions,
  floorOptions,
  locationTypeOptions,
  onSubmit,
} = await useAddressForm({
  form,
  t,
  messages: () => ({ saved: t('success'), saveError: t('error') }),
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <AccountPageHeader :title="t('title')">
      <template #actions>
        <UButton
          :label="t('back')"
          :to="localePath('account-addresses')"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          size="sm"
        />
      </template>
    </AccountPageHeader>

    <div class="rounded-[1.25rem] bg-default p-6 ring ring-default">
      <UForm ref="form" :schema="schema" :state="state" class="grid gap-4 md:grid-cols-2" @error="scrollToFirstFormError" @submit="onSubmit">
        <!-- Title -->
        <UFormField :label="t('form.title')" name="title" required>
          <UInput
            v-model="state.title"
            :placeholder="t('form.title')"
            autocomplete="honorific-prefix"
            icon="i-heroicons-tag"
            size="xl"
          />
        </UFormField>

        <!-- First Name -->
        <UFormField :label="t('form.first_name')" name="firstName" required>
          <UInput
            v-model="state.firstName"
            :placeholder="t('form.first_name')"
            autocomplete="given-name"
            icon="i-heroicons-user"
            size="xl"
          />
        </UFormField>

        <!-- Last Name -->
        <UFormField :label="t('form.last_name')" name="lastName" required>
          <UInput
            v-model="state.lastName"
            :placeholder="t('form.last_name')"
            autocomplete="family-name"
            icon="i-heroicons-user"
            size="xl"
          />
        </UFormField>

        <!-- Phone — a country picker + the number; it follows this form's country until picked -->
        <FormPhoneInput
          v-model="state.phone"
          v-model:country="phonePick"
          :label="t('form.phone')"
          name="phone"
          required
          :follow-country="state.country"
          :pinned-countries="shippableCountryCodes"
          size="xl"
        />

        <!-- Address: country first (postcode format, regions, delivery), then street → number → zipcode → city → region -->
        <UFormField :label="t('form.country')" name="country" required>
          <USelect
            v-model="state.country"
            size="xl"
            :aria-label="t('form.country')"
            icon="i-heroicons-globe-alt"
            :items="countryOptions"
            :placeholder="t('form.select_placeholder')"
            autocomplete="country"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('form.street')" name="street" required>
          <UInput
            v-model="state.street"
            :placeholder="t('form.street')"
            autocomplete="address-line1"
            icon="i-heroicons-map-pin"
            size="xl"
          />
        </UFormField>

        <UFormField :label="t('form.street_number')" name="streetNumber" required>
          <UInput
            v-model="state.streetNumber"
            :placeholder="t('form.street_number')"
            size="xl"
          />
        </UFormField>

        <UFormField :label="t('form.zipcode')" name="zipcode" required>
          <UInput
            v-model="state.zipcode"
            :placeholder="t('form.zipcode')"
            autocomplete="postal-code"
            inputmode="numeric"
            size="xl"
          />
        </UFormField>

        <UFormField :label="t('form.city')" name="city" required>
          <UInput
            v-model="state.city"
            :placeholder="t('form.city')"
            autocomplete="address-level2"
            icon="i-heroicons-building-office-2"
            size="xl"
          />
        </UFormField>

        <UFormField
          v-if="selectedCountry(state.country)?.hasRegions !== false"
          :label="t('form.region')"
          name="region"
          required
        >
          <USelect
            v-model="state.region"
            size="xl"
            :aria-label="t('form.region')"
            icon="i-heroicons-map"
            :items="regionOptions"
            :placeholder="t('form.select_placeholder')"
            :disabled="!state.country"
            autocomplete="address-level1"
            class="w-full"
          />
        </UFormField>

        <!-- Floor -->
        <UFormField :label="t('form.floor')" name="floor">
          <USelectMenu
            v-model="state.floor"
            :aria-label="t('form.floor')"
            icon="i-heroicons-building-office"
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
            :aria-label="t('form.location_type')"
            icon="i-heroicons-home"
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
          <UButton type="submit" color="neutral" size="lg" :loading="isSubmitting" :disabled="isSubmitting">
            {{ t('form.submit') }}
          </UButton>
        </div>
      </UForm>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Νέα διεύθυνση
  back: Επιστροφή στις διευθύνσεις
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
en:
  title: New address
  back: Back to addresses
  error: The address could not be created
  success: Address created
  form:
    select_placeholder: Choose
    title: Address
    first_name: First name
    last_name: Last name
    street: Street
    street_number: Street number
    city: City
    zipcode: Postcode
    phone: Phone
    notes: Notes
    floor: Floor
    floor_options:
      BASEMENT: Basement
      GROUND_FLOOR: Ground floor
      FIRST_FLOOR: 1st floor
      SECOND_FLOOR: 2nd floor
      THIRD_FLOOR: 3rd floor
      FOURTH_FLOOR: 4th floor
      FIFTH_FLOOR: 5th floor
      SIXTH_FLOOR_PLUS: 6th floor or above
    location_type: Location
    location_type_options:
      HOME: Home
      OFFICE: Office
      OTHER: Other
    country: Country
    region: Region
    submit: Save
</i18n>
