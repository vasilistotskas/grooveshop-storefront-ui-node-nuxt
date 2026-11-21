<script lang="ts" setup>
/**
 * The address a home delivery goes to, on the delivery step: a pickup
 * order is delivered to the point and asks none of it. The country is
 * the details step's; the region, the street and the postcode are here,
 * since only a home delivery is priced and sent with them.
 */
const formState = defineModel<Record<string, any>>('formState', { required: true })

const props = defineProps<{
  regionOptions: Array<{ label: string, value: string }>
  /** The selected country's ``postalCodeExample``, the postcode placeholder. */
  postcodeExample?: string
  /** The ``Country`` row of ``formState.country``: whether a region applies. */
  selectedCountry?: Country | null
  /** Whether the store has an ACS contract (the address suggestion). */
  acsEnabled: boolean
  /** ``saved``: the address came from the shopper's address book. */
  mode?: 'saved' | 'new'
}>()

const { t } = useStoreI18n('components/variants/webside/Checkout/DeliveryAddress')
const { loggedIn } = useUserSession()

// "Save to my address book" only makes sense for authenticated users
// who are typing a fresh address — guests can't own addresses and
// shoppers in ``saved`` mode already have this one stored.
const canOfferSave = computed(() => loggedIn.value && props.mode !== 'saved')
</script>

<template>
  <div class="space-y-4">
    <h3
      class="
        text-lg font-medium text-primary-900
        dark:text-primary-100
      "
    >
      {{ t('delivery_address') }}
    </h3>

    <div
      class="
        grid grid-cols-1 gap-4
        md:grid-cols-3
      "
    >
      <UFormField
        :label="t('form.street')"
        name="street"
        required
        class="md:col-span-2"
      >
        <UInput
          v-model="formState.street"
          size="xl"
          autocomplete="address-line1"
          :placeholder="t('form.street_placeholder')"
          class="w-full"
          icon="i-heroicons-map-pin"
        />
      </UFormField>

      <UFormField :label="t('form.street_number')" name="streetNumber" required>
        <UInput
          v-model="formState.streetNumber"
          size="xl"
          :placeholder="t('form.street_number_placeholder')"
          class="w-full"
        />
      </UFormField>
    </div>

    <UFormField :label="t('form.address_line_2')" name="addressLine2">
      <UInput
        v-model="formState.addressLine2"
        size="xl"
        autocomplete="address-line2"
        :placeholder="t('form.address_line_2_placeholder')"
        maxlength="255"
        class="w-full"
      />
    </UFormField>

    <div
      class="
        grid grid-cols-1 gap-4
        md:grid-cols-2
      "
    >
      <UFormField :label="t('form.zipcode')" name="zipcode" required>
        <UInput
          v-model="formState.zipcode"
          size="xl"
          autocomplete="postal-code"
          inputmode="numeric"
          :placeholder="postcodeExample ? t('form.zipcode_placeholder', { example: postcodeExample }) : undefined"
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

    <UFormField
      v-if="selectedCountry?.hasRegions !== false"
      :label="t('form.region')"
      name="region"
      required
    >
      <USelect
        v-model="formState.region"
        :items="regionOptions"
        autocomplete="address-level1"
        size="xl"
        class="w-full"
        :disabled="!regionOptions.length"
      />
    </UFormField>

    <!-- ACS address-validation chip (Phase 4b polish).
         Greece-only because ACS only services GR, and only for
         a store with an ACS contract (the proxy answers 503
         otherwise); failures are silent so a misconfigured
         provider never blocks the form. -->
    <WebsideCheckoutAcsAddressSuggestion
      v-model:formState="formState"
      :enabled="formState.country === 'GR' && acsEnabled"
    />

    <!-- Save-to-address-book affordance. The checkout form already
         collects every required UserAddress field except ``title``;
         the title input appears only once the user opts in so we
         don't clutter the form with a field most shoppers won't need. -->
    <template v-if="canOfferSave">
      <USeparator />
      <UCheckbox
        v-model="formState.saveAddress"
        :label="t('save_address.label')"
        :description="t('save_address.description')"
        color="primary"
      />
      <UFormField
        v-if="formState.saveAddress"
        :label="t('save_address.title_label')"
        :help="t('save_address.title_help')"
        name="addressTitle"
        required
      >
        <UInput
          v-model="formState.addressTitle"
          size="xl"
          :placeholder="t('save_address.title_placeholder')"
          leading-icon="i-heroicons-bookmark"
          class="w-full"
          maxlength="255"
        />
      </UFormField>
    </template>
  </div>
</template>

<i18n lang="yaml">
el:
  delivery_address: Διεύθυνση Παράδοσης
  save_address:
    label: "Αποθήκευση της διεύθυνσης στον λογαριασμό μου"
    description: "Θα είναι διαθέσιμη σε επόμενες παραγγελίες για γρήγορη επιλογή."
    title_label: "Ονομασία διεύθυνσης"
    title_placeholder: "π.χ. Σπίτι, Δουλειά"
    title_help: "Δώσε ένα σύντομο όνομα για να τη βρίσκεις εύκολα."
</i18n>
