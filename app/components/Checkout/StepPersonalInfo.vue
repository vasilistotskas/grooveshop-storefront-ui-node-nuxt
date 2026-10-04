<script lang="ts" setup>
import type { FormError } from '@nuxt/ui'

const formState = defineModel<Record<string, any>>('formState', { required: true })

const props = defineProps<{
  schema: any
  countryOptions: Array<{ label: string, value: string }>
  regionOptions: Array<{ label: string, value: string }>
  savedAddresses?: UserAddressDetail[]
  selectedSavedAddressId?: number | null
  /**
   * ``saved`` = shopper picked a saved address (personal info + address
   * form sections collapse into the card summary); ``new`` = shopper is
   * typing a fresh address so the full form stays visible.
   */
  mode?: 'saved' | 'new'
  /**
   * Mirrors the ``B2B_INVOICING_ENABLED`` extra setting. When false, the
   * Τιμολόγιο (INVOICE) choice is hidden and orders ship as RECEIPT only.
   */
  b2bInvoicingEnabled?: boolean
  /**
   * The selected country's ``postalCodeExample`` (e.g. ``151 24``),
   * shown as the postcode placeholder.
   */
  postcodeExample?: string
  /**
   * The full ``Country`` row matching ``formState.country`` — drives
   * whether the region field applies (``hasRegions``).
   */
  selectedCountry?: Country | null
  /**
   * Django's field errors from a rejected order, shown under their
   * inputs through ``UForm``'s ``setErrors``.
   */
  serverErrors?: FormError[]
  /**
   * Whether this tenant actually has an ACS contract — i.e. whether
   * ``/api/v1/shipping/options`` returned an ``acs`` row. Without it
   * the address-validation proxy can only answer 503.
   */
  acsEnabled?: boolean
}>()

const emit = defineEmits<{
  'next': []
  'select-saved-address': [addressId: number]
  'use-new-address': []
}>()

const { t } = useI18n()

const { loggedIn } = useUserSession()

const hasSavedAddresses = computed(() => (props.savedAddresses?.length ?? 0) > 0)
const isSavedMode = computed(() => props.mode === 'saved')
// "Save to my address book" only makes sense for authenticated users
// who are typing a fresh address — guests can't own addresses and
// shoppers in ``saved`` mode already have this one stored.
const canOfferSave = computed(() => loggedIn.value && !isSavedMode.value)

function onSelectSaved(id: number) {
  emit('select-saved-address', id)
}

function onUseNew() {
  emit('use-new-address')
}

const documentItems = computed(() => [
  { value: 'RECEIPT', label: t('document.receipt.title'), description: t('document.receipt.description') },
  { value: 'INVOICE', label: t('document.invoice.title'), description: t('document.invoice.description') },
])

/**
 * Receipt or invoice. Going back to a receipt wipes every billing field:
 * a VAT id left behind would still reach Django and an invoice would be
 * issued to a company the shopper un-picked.
 */
function setDocumentType(type: string) {
  formState.value.documentType = type
  if (type === 'INVOICE') return
  Object.assign(formState.value, {
    billingVatId: '',
    billingCountry: '',
    billingCompanyName: '',
    billingTaxOffice: '',
    billingActivity: '',
    billingSameAsShipping: true,
    billingStreet: '',
    billingStreetNumber: '',
    billingCity: '',
    billingZipcode: '',
  })
}

const CARD = 'flex flex-col gap-5 rounded-[1.25rem] bg-default p-5 ring ring-default sm:p-6'
const HEADING = 'font-display text-xl font-bold text-highlighted'

// Expose the form's submit() so the primary CTA (it lives under the step,
// in the checkout page) can trigger Zod validation + emit `next`.
const formRef = useTemplateRef<{
  submit: () => Promise<void>
  setErrors: (errors: FormError[]) => void
}>('formRef')
defineExpose({
  submit: () => formRef.value?.submit(),
})

// The step mounts after a rejected order sends the shopper back here,
// so apply on mount as well as on change.
function applyServerErrors() {
  if (props.serverErrors?.length) formRef.value?.setErrors(props.serverErrors)
}
onMounted(applyServerErrors)
watch(() => props.serverErrors, applyServerErrors)
</script>

<template>
  <UForm
    ref="formRef"
    :state="formState"
    :schema="schema"
    class="flex flex-col gap-6"
    @error="scrollToFirstFormError"
    @submit="emit('next')"
  >
    <!-- Contact — hidden with the rest of the typed details when the
         shopper picked a saved address, which already holds them. -->
    <section
      v-if="!isSavedMode"
      aria-labelledby="checkout-contact-title"
      :class="CARD"
    >
      <h2
        id="checkout-contact-title"
        :class="HEADING"
      >
        {{ t('contact.title') }}
      </h2>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UFormField
          :label="t('form.email')"
          name="email"
          required
        >
          <UInput
            v-model="formState.email"
            type="email"
            size="lg"
            autocomplete="email"
            inputmode="email"
            leading-icon="i-lucide-mail"
            class="w-full"
          />
        </UFormField>

        <div class="flex flex-col gap-1.5">
          <FormPhoneInput
            v-model="formState.phone"
            v-model:country="formState.phoneCountry"
            :label="t('form.phone')"
            name="phone"
            required
            :follow-country="formState.country"
            :pinned-countries="countryOptions.map(option => option.value)"
            size="lg"
          />
          <p class="text-xs text-toned">
            {{ t('contact.phone_help') }}
          </p>
        </div>
      </div>
    </section>

    <section
      aria-labelledby="checkout-address-title"
      :class="CARD"
    >
      <h2
        id="checkout-address-title"
        :class="HEADING"
      >
        {{ t('delivery_address') }}
      </h2>

      <!-- Saved addresses as cards, and the way to type a new one. Only
           for a shopper who actually has some; guests never see this. -->
      <CheckoutSavedAddresses
        v-if="hasSavedAddresses"
        :addresses="savedAddresses ?? []"
        :selected-id="selectedSavedAddressId ?? null"
        :mode="mode ?? 'new'"
        @select="onSelectSaved"
        @new="onUseNew"
      />

      <!-- The typed address — hidden while a saved one is picked: its
           card already holds the name, street, city, postcode, country
           and region, so the inputs would be pure duplication. -->
      <template v-if="!isSavedMode">
        <USeparator v-if="hasSavedAddresses" />

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <UFormField
            :label="t('form.first_name')"
            name="firstName"
            required
          >
            <UInput
              v-model="formState.firstName"
              size="lg"
              autocomplete="given-name"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="t('form.last_name')"
            name="lastName"
            required
          >
            <UInput
              v-model="formState.lastName"
              size="lg"
              autocomplete="family-name"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Country first: it sets the postcode format, the regions and
             the delivery options. -->
        <UFormField
          :label="t('form.country')"
          name="country"
          required
        >
          <USelect
            v-model="formState.country"
            autocomplete="country"
            :items="countryOptions"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
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
          :enabled="formState.country === 'GR' && props.acsEnabled !== false"
        />

        <div
          class="grid grid-cols-1 gap-4"
          :class="selectedCountry?.hasRegions !== false ? 'md:grid-cols-3' : 'md:grid-cols-2'"
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
      </template>
    </section>

    <!-- Receipt (retail Α.Λ.Π., no VAT needed) or invoice. Gated by
         ``B2B_INVOICING_ENABLED`` so the owner can hide the whole
         invoice flow without a deploy; Django also rejects ``INVOICE``
         when the setting is off. Cross-field validation on step1Schema
         requires a valid 9-digit ΑΦΜ before an invoice can advance. -->
    <section
      v-if="b2bInvoicingEnabled !== false"
      aria-labelledby="checkout-document-title"
      :class="CARD"
    >
      <h2
        id="checkout-document-title"
        :class="HEADING"
      >
        {{ t('document.title') }}
      </h2>

      <URadioGroup
        :model-value="formState.documentType"
        :items="documentItems"
        :legend="t('document.title')"
        variant="card"
        color="secondary"
        orientation="horizontal"
        :ui="{ legend: 'sr-only', fieldset: 'grid grid-cols-2 gap-3', item: `
          w-full
        ` }"
        @update:model-value="(value) => setDocumentType(String(value))"
      />

      <template v-if="formState.documentType === 'INVOICE'">
        <UFormField
          :label="t('form.invoice.company_label')"
          name="billingCompanyName"
          required
        >
          <UInput
            v-model="formState.billingCompanyName"
            size="lg"
            leading-icon="i-lucide-building-2"
            maxlength="255"
            class="w-full"
          />
        </UFormField>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <UFormField
            :label="t('form.invoice.vat_label')"
            :help="t('form.invoice.vat_help')"
            name="billingVatId"
            required
          >
            <UInput
              v-model="formState.billingVatId"
              size="lg"
              placeholder="123456789"
              leading-icon="i-lucide-id-card"
              maxlength="12"
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="t('form.invoice.tax_office_label')"
            name="billingTaxOffice"
            required
          >
            <UInput
              v-model="formState.billingTaxOffice"
              size="lg"
              leading-icon="i-lucide-landmark"
              maxlength="100"
              class="w-full"
            />
          </UFormField>
        </div>
        <UFormField
          :label="t('form.invoice.activity_label')"
          :help="t('form.invoice.activity_help')"
          name="billingActivity"
          required
        >
          <UInput
            v-model="formState.billingActivity"
            size="lg"
            leading-icon="i-lucide-briefcase"
            maxlength="255"
            class="w-full"
          />
        </UFormField>
        <UCheckbox
          v-model="formState.billingSameAsShipping"
          :label="t('form.invoice.billing_same_label')"
          :description="t('form.invoice.billing_same_description')"
          color="neutral"
        />
        <template v-if="!formState.billingSameAsShipping">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField
              :label="t('form.invoice.billing_street_label')"
              name="billingStreet"
              required
            >
              <UInput
                v-model="formState.billingStreet"
                size="lg"
                maxlength="255"
                class="w-full"
                icon="i-lucide-map-pin"
              />
            </UFormField>
            <UFormField
              :label="t('form.invoice.billing_street_number_label')"
              name="billingStreetNumber"
              required
            >
              <UInput
                v-model="formState.billingStreetNumber"
                size="lg"
                maxlength="50"
                class="w-full"
              />
            </UFormField>
          </div>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField
              :label="t('form.invoice.billing_city_label')"
              name="billingCity"
              required
            >
              <UInput
                v-model="formState.billingCity"
                size="lg"
                maxlength="100"
                class="w-full"
              />
            </UFormField>
            <UFormField
              :label="t('form.invoice.billing_zipcode_label')"
              name="billingZipcode"
              required
            >
              <UInput
                v-model="formState.billingZipcode"
                size="lg"
                maxlength="20"
                class="w-full"
              />
            </UFormField>
          </div>
        </template>
      </template>
    </section>

    <!-- An annotation on the order, not an address field: always shown. -->
    <section :class="CARD">
      <UFormField
        :label="t('form.customer_notes')"
        :help="t('form.customer_notes_help')"
        name="customerNotes"
      >
        <UTextarea
          v-model="formState.customerNotes"
          :rows="3"
          size="lg"
          autoresize
          :maxlength="500"
          class="w-full"
        />
      </UFormField>
    </section>
  </UForm>
</template>

<i18n lang="yaml">
el:
  contact:
    title: Στοιχεία επικοινωνίας
    phone_help: Για ενημερώσεις παράδοσης με SMS.
  delivery_address: Διεύθυνση παράδοσης
  document:
    title: Απόδειξη ή τιμολόγιο
    receipt:
      title: Απόδειξη
      description: Για προσωπικές αγορές
    invoice:
      title: Τιμολόγιο
      description: Για επιχειρήσεις
  save_address:
    label: "Αποθήκευση της διεύθυνσης στον λογαριασμό μου"
    description: "Θα είναι διαθέσιμη σε επόμενες παραγγελίες για γρήγορη επιλογή."
    title_label: "Ονομασία διεύθυνσης"
    title_placeholder: "π.χ. Σπίτι, Δουλειά"
    title_help: "Δώσε ένα σύντομο όνομα για να τη βρίσκεις εύκολα."
en:
  contact:
    title: Contact
    phone_help: For delivery updates by SMS.
  delivery_address: Delivery address
  document:
    title: Receipt or invoice
    receipt:
      title: Receipt
      description: For personal purchases
    invoice:
      title: Invoice
      description: For businesses
  save_address:
    label: "Save this address to my account"
    description: "It will be there to pick from on your next order."
    title_label: "Address name"
    title_placeholder: "e.g. Home, Work"
    title_help: "A short name so you can find it easily."
</i18n>
