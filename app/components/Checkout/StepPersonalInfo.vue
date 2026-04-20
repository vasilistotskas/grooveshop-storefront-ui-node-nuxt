<script lang="ts" setup>
const formState = defineModel<Record<string, any>>('formState', { required: true })

const props = defineProps<{
  schema: any
  countryOptions: Array<{ label: string, value: string }>
  regionOptions: Array<{ label: string, value: string }>
  savedAddresses?: UserAddressDetail[]
  selectedSavedAddressId?: number | null
}>()

const emit = defineEmits<{
  'next': []
  'country-change': []
  'select-saved-address': [addressId: number | null]
}>()

const { t } = useI18n()

// Only render the picker when there's a real choice to make (≥ 2 saved
// addresses). Single-address users already got their main prefilled on
// mount, so a one-option dropdown would just be visual noise.
const showAddressPicker = computed(() => (props.savedAddresses?.length ?? 0) >= 2)

const savedAddressOptions = computed(() => {
  const options = (props.savedAddresses ?? []).map(address => ({
    label: [
      address.title,
      `${address.street} ${address.streetNumber}`,
      `${address.zipcode} ${address.city}`,
    ]
      .filter(Boolean)
      .join(' · '),
    value: address.id,
  }))
  return options
})

const currentPickerValue = computed<number | null>(() => props.selectedSavedAddressId ?? null)

function onPickerChange(value: number | null | undefined) {
  emit('select-saved-address', value ?? null)
}
</script>

<template>
  <UCard class="overflow-hidden">
    <template #header>
      <h2 class="text-xl font-semibold">
        {{ t('steps.info_and_address') }}
      </h2>
    </template>

    <UForm :state="formState" :schema="schema" class="space-y-6" @submit="emit('next')">
      <!-- Saved address picker (shown only for users with ≥ 2 saved
           addresses so the main-address prefill remains the default
           experience for single-address users). -->
      <UFormField
        v-if="showAddressPicker"
        :label="t('saved_addresses.label')"
        :help="t('saved_addresses.help')"
      >
        <USelect
          :model-value="currentPickerValue ?? undefined"
          :items="savedAddressOptions"
          :placeholder="t('saved_addresses.placeholder')"
          size="xl"
          class="w-full"
          @update:model-value="onPickerChange"
        />
      </UFormField>

      <!-- Personal Information Section -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-primary-900 dark:text-primary-100">
          {{ t('personal_information') }}
        </h3>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <UFormField :label="t('form.first_name')" name="firstName" required>
            <UInput
              v-model="formState.firstName"
              size="xl"
              autocomplete="given-name"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="t('form.last_name')" name="lastName" required>
            <UInput
              v-model="formState.lastName"
              size="xl"
              autocomplete="family-name"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <UFormField :label="t('form.email')" name="email" required>
            <UInput
              v-model="formState.email"
              type="email"
              size="xl"
              autocomplete="email"
              inputmode="email"
              leading-icon="i-heroicons-envelope"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="t('form.phone')" name="phone" required>
            <UInput
              v-model="formState.phone"
              type="tel"
              size="xl"
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
        </div>
      </div>

      <USeparator />

      <!-- Address Section — ordered per Greek postal norm: street → number → zipcode → city → area → region → country -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-primary-900 dark:text-primary-100">
          {{ t('delivery_address') }}
        </h3>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <UFormField :label="t('form.street')" name="street" required class="md:col-span-2">
            <UInput
              v-model="formState.street"
              size="xl"
              autocomplete="address-line1"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="t('form.street_number')" name="streetNumber" required>
            <UInput
              v-model="formState.streetNumber"
              size="xl"
              autocomplete="address-line2"
              inputmode="numeric"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <UFormField :label="t('form.zipcode')" name="zipcode" required>
            <UInput
              v-model="formState.zipcode"
              size="xl"
              autocomplete="postal-code"
              inputmode="numeric"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="t('form.city')" name="city" required>
            <UInput
              v-model="formState.city"
              size="xl"
              autocomplete="address-level2"
              leading-icon="i-heroicons-building-office-2"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <UFormField :label="t('form.place')" name="place" required>
            <UInput
              v-model="formState.place"
              size="xl"
              leading-icon="i-heroicons-map-pin"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="t('form.region')" name="region" required>
            <USelect
              v-model="formState.region"
              :items="regionOptions"
              size="xl"
              class="w-full"
              :disabled="!regionOptions.length"
            />
          </UFormField>
        </div>

        <UFormField :label="t('form.country')" name="country" required>
          <USelect
            v-model="formState.country"
            :items="countryOptions"
            size="xl"
            class="w-full"
            @update:model-value="emit('country-change')"
          />
        </UFormField>

        <UFormField :label="t('form.customer_notes')" name="customerNotes">
          <UTextarea
            v-model="formState.customerNotes"
            :rows="3"
            size="xl"
            autoresize
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="flex justify-end">
        <UButton
          type="submit"
          size="lg"
          color="success"
          icon="i-heroicons-arrow-right"
          trailing
        >
          {{ t('continue') }}
        </UButton>
      </div>
    </UForm>
  </UCard>
</template>

<i18n lang="yaml">
el:
  steps:
    info_and_address: Στοιχεία & Διεύθυνση
  personal_information: Προσωπικά Στοιχεία
  delivery_address: Διεύθυνση Παράδοσης
  saved_addresses:
    label: "Επίλεξε αποθηκευμένη διεύθυνση"
    placeholder: "Επίλεξε διεύθυνση"
    help: "Διάλεξε μία από τις διευθύνσεις σου για να συμπληρωθούν αυτόματα τα πεδία."
  continue: Συνέχεια
  form:
    first_name: Όνομα
    last_name: Επίθετο
    email: Email
    phone: Τηλέφωνο
    phone_placeholder: "6912345678"
    place: Περιοχή
    city: Πόλη
    zipcode: Ταχυδρομικός Κώδικας
    country: Χώρα
    region: Περιφέρεια
    street: Οδός
    street_number: Αριθμός Οδού
    customer_notes: Σημειώσεις
</i18n>
