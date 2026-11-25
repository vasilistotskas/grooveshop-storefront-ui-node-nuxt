<script lang="ts" setup>
/**
 * Receipt or invoice, on the delivery step: an invoice's address may be
 * the delivery address only for a home delivery (``billingSharesDelivery``).
 * Shown when the store issues invoices (the ``b2bInvoicing`` feature).
 */
const formState = defineModel<Record<string, any>>('formState', { required: true })

const { t } = useStoreI18n('components/Checkout/DocumentChoice')
const headingId = useId()

const documentItems = computed(() => [
  { value: 'RECEIPT', label: t('document.receipt.title'), description: t('document.receipt.description') },
  { value: 'INVOICE', label: t('document.invoice.title'), description: t('document.invoice.description') },
])

// Receipt or invoice; a receipt wipes the billing fields (setDocumentType).
function chooseDocument(value: unknown) {
  setDocumentType(formState.value, zOrderCreateDocumentType.parse(value))
}
</script>

<template>
  <!-- Receipt (retail Α.Λ.Π., no VAT needed) or invoice. The step
       mounts it only with the ``b2bInvoicing`` feature; Django also
       rejects ``INVOICE`` when it is off. Cross-field validation on
       step2Schema requires a valid 9-digit ΑΦΜ before an invoice can
       advance. -->
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
      @update:model-value="chooseDocument"
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
      <div
        class="
          grid grid-cols-1 gap-4
          md:grid-cols-2
        "
      >
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
      <!-- "Same as delivery" is a home delivery's: a pickup point is no
           company's address, so a pickup invoice names its own. -->
      <UCheckbox
        v-if="formState.shippingMethod === 'home_delivery'"
        v-model="formState.billingSameAsShipping"
        :label="t('form.invoice.billing_same_label')"
        :description="t('form.invoice.billing_same_description')"
        color="neutral"
      />
      <template v-if="!billingSharesDelivery(formState)">
        <div
          class="
            grid grid-cols-1 gap-4
            md:grid-cols-2
          "
        >
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
        <div
          class="
            grid grid-cols-1 gap-4
            md:grid-cols-2
          "
        >
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
</template>

<i18n lang="yaml">
el:
  document:
    title: Απόδειξη ή τιμολόγιο
    receipt:
      title: Απόδειξη
      description: Για προσωπικές αγορές
    invoice:
      title: Τιμολόγιο
      description: Για επιχειρήσεις
en:
  document:
    title: Receipt or invoice
    receipt:
      title: Receipt
      description: For personal purchases
    invoice:
      title: Invoice
      description: For businesses
</i18n>
