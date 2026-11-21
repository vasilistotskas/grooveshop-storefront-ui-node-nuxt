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
  /**
   * Whether this tenant actually has an ACS contract — i.e. whether
   * ``/api/v1/shipping/options`` returned an ``acs`` row. Without it
   * the address-validation proxy can only answer 503.
   */
  acsEnabled: boolean
  /** ``saved``: the address came from the shopper's address book. */
  mode?: 'saved' | 'new'
}>()

const { t } = useStoreI18n('components/Checkout/DeliveryAddress')
const { loggedIn } = useUserSession()
const headingId = useId()

// "Save to my address book" only makes sense for authenticated users
// who are typing a fresh address — guests can't own addresses and
// shoppers in ``saved`` mode already have this one stored.
const canOfferSave = computed(() => loggedIn.value && props.mode !== 'saved')
</script>

<template>
  <section
    :aria-labelledby="headingId"
    class="
      flex flex-col gap-5 rounded-[1.25rem] bg-default p-5 ring ring-default
      sm:p-6
    "
  >
    <h2
      :id="headingId"
      class="font-display text-[1.375rem] font-bold text-highlighted"
    >
      {{ t('title') }}
    </h2>

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
          size="lg"
          autocomplete="address-line1"
          :placeholder="t('form.street_placeholder')"
          class="w-full"
        />
      </UFormField>

      <UFormField
        :label="t('form.street_number')"
        name="streetNumber"
        required
      >
        <UInput
          v-model="formState.streetNumber"
          size="lg"
          :placeholder="t('form.street_number_placeholder')"
          class="w-full"
        />
      </UFormField>
    </div>

    <!-- ACS address validation. Greece-only because ACS only
         services GR, and only when the tenant HAS ACS: the proxy
         answers 503 "not configured" otherwise, so a country-only
         gate meant a guaranteed-failing request on every debounced
         keystroke. Failures stay silent either way — a disabled
         provider must never block the form. -->
    <CheckoutAcsAddressSuggestion
      v-model:form-state="formState"
      :enabled="formState.country === 'GR' && acsEnabled"
    />

    <div
      class="grid grid-cols-1 gap-4"
      :class="selectedCountry?.hasRegions !== false ? 'md:grid-cols-3' : `
        md:grid-cols-2
      `"
    >
      <UFormField
        :label="t('form.zipcode')"
        name="zipcode"
        required
      >
        <UInput
          v-model="formState.zipcode"
          size="lg"
          autocomplete="postal-code"
          inputmode="numeric"
          :placeholder="postcodeExample ? t('form.zipcode_placeholder', { example: postcodeExample }) : undefined"
          class="w-full"
        />
      </UFormField>

      <UFormField
        :label="t('form.city')"
        name="city"
        required
      >
        <UInput
          v-model="formState.city"
          size="lg"
          autocomplete="address-level2"
          class="w-full"
        />
      </UFormField>

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
          size="lg"
          class="w-full"
          :disabled="!regionOptions.length"
        />
      </UFormField>
    </div>

    <!-- Save-to-address-book. The checkout already collects every
         required UserAddress field except ``title``, which appears
         only once the shopper opts in. -->
    <template v-if="canOfferSave">
      <USeparator />
      <UCheckbox
        v-model="formState.saveAddress"
        :label="t('save_address.label')"
        :description="t('save_address.description')"
        color="neutral"
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
          size="lg"
          :placeholder="t('save_address.title_placeholder')"
          leading-icon="i-lucide-bookmark"
          class="w-full"
          maxlength="255"
        />
      </UFormField>
    </template>
  </section>
</template>

<i18n lang="yaml">
el:
  title: Διεύθυνση παράδοσης
  save_address:
    label: "Αποθήκευση της διεύθυνσης στον λογαριασμό μου"
    description: "Θα είναι διαθέσιμη σε επόμενες παραγγελίες για γρήγορη επιλογή."
    title_label: "Ονομασία διεύθυνσης"
    title_placeholder: "π.χ. Σπίτι, Δουλειά"
    title_help: "Δώσε ένα σύντομο όνομα για να τη βρίσκεις εύκολα."
en:
  title: Delivery address
  save_address:
    label: "Save this address to my account"
    description: "It will be there to pick from on your next order."
    title_label: "Address name"
    title_placeholder: "e.g. Home, Work"
    title_help: "A short name so you can find it easily."
</i18n>
