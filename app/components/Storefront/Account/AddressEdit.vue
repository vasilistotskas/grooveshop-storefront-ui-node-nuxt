<script lang="ts" setup>
const { t } = useI18n()
// Every account route rendered with the document title left at the
// store name, twice — 46 pages whose browser tab and history entry were
// indistinguishable. The `title` string was already here and simply
// never applied.
useHead({ title: () => t('title') })
const localePath = useLocalePath()

const form = useTemplateRef('form')

const { addressId, address } = await useUserAddress()

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
  onSetMain,
} = await useAddressForm({
  form,
  t,
  messages: () => ({ saved: t('success'), saveError: t('error') }),
  edit: {
    addressId,
    address: address.value,
    mainMessages: () => ({ set: t('main.success'), error: t('main.error') }),
  },
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <AccountPageHeader :title="address?.title || t('title')">
      <template #actions>
        <UBadge
          v-if="address?.isMain"
          :label="t('main.title')"
          class="bg-inverted text-inverted ring-0"
        />
        <UButton
          v-else
          :label="t('main.button')"
          color="neutral"
          variant="outline"
          size="sm"
          @click="onSetMain"
        />
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

    <div
      v-if="address"
      class="rounded-[1.25rem] bg-default p-6 ring ring-default"
    >
      <UForm ref="form" :schema="schema" :state="state" class="grid gap-4 md:grid-cols-2" @error="scrollToFirstFormError" @submit="onSubmit">
        <!-- Title -->
        <UFormField :label="t('form.title')" name="title" required>
          <UInput
            v-model="state.title"
            icon="i-heroicons-tag"
            :placeholder="t('form.title')"
            autocomplete="honorific-prefix"
          />
        </UFormField>

        <!-- First Name -->
        <UFormField :label="t('form.first_name')" name="firstName" required>
          <UInput
            v-model="state.firstName"
            icon="i-heroicons-user"
            :placeholder="t('form.first_name')"
            autocomplete="given-name"
          />
        </UFormField>

        <!-- Last Name -->
        <UFormField :label="t('form.last_name')" name="lastName" required>
          <UInput
            v-model="state.lastName"
            icon="i-heroicons-user"
            :placeholder="t('form.last_name')"
            autocomplete="family-name"
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
        />

        <!-- Address: country first (postcode format, regions, delivery), then street → number → zipcode → city → region -->
        <UFormField :label="t('form.country')" name="country" required>
          <USelect
            v-model="state.country"
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
            icon="i-heroicons-map-pin"
            :placeholder="t('form.street')"
            autocomplete="address-line1"
          />
        </UFormField>

        <UFormField :label="t('form.street_number')" name="streetNumber" required>
          <UInput
            v-model="state.streetNumber"
            :placeholder="t('form.street_number')"
          />
        </UFormField>

        <UFormField :label="t('form.zipcode')" name="zipcode" required>
          <UInput
            v-model="state.zipcode"
            :placeholder="t('form.zipcode')"
            autocomplete="postal-code"
            inputmode="numeric"
          />
        </UFormField>

        <UFormField :label="t('form.city')" name="city" required>
          <UInput
            v-model="state.city"
            icon="i-heroicons-building-office-2"
            :placeholder="t('form.city')"
            autocomplete="address-level2"
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
            {{ t('form.update') }}
          </UButton>
        </div>
      </UForm>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Επεξεργασία διεύθυνσης
  error: Σφάλμα ενημέρωσης διεύθυνσης
  success: Η διεύθυνση ενημερώθηκε με επιτυχία
  back: Επιστροφή στις διευθύνσεις
  main:
    title: Κύρια
    success: Η κύρια διεύθυνση ενημερώθηκε με επιτυχία
    error: Σφάλμα ενημέρωσης κύριας διεύθυνσης
    button: Ορισμός ως κύρια διεύθυνση
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
    update: Ενημέρωση
en:
  title: Edit address
  error: The address could not be updated
  success: Address updated
  back: Back to addresses
  main:
    title: Main
    success: Main address updated
    error: The main address could not be updated
    button: Set as main address
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
    update: Update
</i18n>
