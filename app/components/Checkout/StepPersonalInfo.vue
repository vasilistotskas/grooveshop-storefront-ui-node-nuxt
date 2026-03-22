<script lang="ts" setup>
const formState = defineModel<Record<string, any>>('formState', { required: true })

defineProps<{
  schema: any
  countryOptions: Array<{ label: string, value: string }>
  regionOptions: Array<{ label: string, value: string }>
}>()

const emit = defineEmits<{
  'next': []
  'country-change': []
}>()

const { t } = useI18n()
</script>

<template>
  <UCard class="overflow-hidden">
    <template #header>
      <h2 class="text-xl font-semibold">
        {{ t('steps.info_and_address') }}
      </h2>
    </template>

    <UForm :state="formState" :schema="schema" class="space-y-6" @submit="emit('next')">
      <!-- Personal Information Section -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-primary-900 dark:text-primary-100">
          {{ t('personal_information') }}
        </h3>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <UFormField :label="t('form.first_name')" name="firstName" required class="[&_label]:sr-only">
            <UInput
              v-model="formState.firstName"
              :placeholder="t('form.first_name')"
              size="xl"
              autocomplete="given-name"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="t('form.last_name')" name="lastName" required class="[&_label]:sr-only">
            <UInput
              v-model="formState.lastName"
              :placeholder="t('form.last_name')"
              size="xl"
              autocomplete="family-name"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <UFormField :label="t('form.email')" name="email" required class="[&_label]:sr-only">
            <UInput
              v-model="formState.email"
              type="email"
              :placeholder="t('form.email')"
              size="xl"
              autocomplete="email"
              leading-icon="i-heroicons-envelope"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="t('form.phone')" name="phone" required class="[&_label]:sr-only">
            <UInput
              v-model="formState.phone"
              type="tel"
              :placeholder="t('form.phone')"
              size="xl"
              autocomplete="tel"
              leading-icon="i-heroicons-phone"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>

      <USeparator />

      <!-- Address Section -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-primary-900 dark:text-primary-100">
          {{ t('delivery_address') }}
        </h3>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <UFormField :label="t('form.country')" name="country" required class="[&_label]:sr-only">
            <USelect
              v-model="formState.country"
              :items="countryOptions"
              :placeholder="t('form.country')"
              size="xl"
              class="w-full"
              @update:model-value="emit('country-change')"
            />
          </UFormField>

          <UFormField :label="t('form.region')" name="region" required class="[&_label]:sr-only">
            <USelect
              v-model="formState.region"
              :items="regionOptions"
              :placeholder="t('form.region')"
              size="xl"
              class="w-full"
              :disabled="!regionOptions.length"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <UFormField :label="t('form.city')" name="city" required class="[&_label]:sr-only">
            <UInput
              v-model="formState.city"
              :placeholder="t('form.city')"
              size="xl"
              autocomplete="address-level2"
              leading-icon="i-heroicons-building-office-2"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="t('form.place')" name="place" required class="[&_label]:sr-only">
            <UInput
              v-model="formState.place"
              :placeholder="t('form.place')"
              size="xl"
              leading-icon="i-heroicons-map-pin"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <UFormField :label="t('form.street')" name="street" required class="md:col-span-2 [&_label]:sr-only">
            <UInput
              v-model="formState.street"
              :placeholder="t('form.street')"
              size="xl"
              autocomplete="address-line1"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="t('form.street_number')" name="streetNumber" required class="[&_label]:sr-only">
            <UInput
              v-model="formState.streetNumber"
              :placeholder="t('form.street_number')"
              size="xl"
              autocomplete="address-line2"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField :label="t('form.zipcode')" name="zipcode" required class="[&_label]:sr-only">
          <UInput
            v-model="formState.zipcode"
            :placeholder="t('form.zipcode')"
            size="xl"
            autocomplete="postal-code"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('form.customer_notes')" name="customerNotes" class="[&_label]:sr-only">
          <UTextarea
            v-model="formState.customerNotes"
            :placeholder="t('form.customer_notes')"
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
  continue: Συνέχεια
  form:
    first_name: Όνομα
    last_name: Επίθετο
    email: Email
    phone: Τηλέφωνο
    place: Περιοχή
    city: Πόλη
    zipcode: Ταχυδρομικός Κώδικας
    country: Χώρα
    region: Περιφέρεια
    street: Οδός
    street_number: Αριθμός Οδού
    customer_notes: Σημειώσεις
</i18n>
