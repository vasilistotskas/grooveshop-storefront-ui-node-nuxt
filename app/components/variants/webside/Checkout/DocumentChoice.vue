<script lang="ts" setup>
/**
 * Receipt or invoice, on the delivery step: an invoice's address may be
 * the delivery address only for a home delivery (``billingSharesDelivery``).
 * Shown when the store issues invoices (the ``b2bInvoicing`` feature).
 */
const formState = defineModel<Record<string, any>>('formState', { required: true })

const { t } = useI18n()
</script>

<template>
  <div class="space-y-4">
    <!-- B2B toggle. Default is RECEIPT (retail Α.Λ.Π., no VAT
         needed). Flipping to INVOICE exposes the ΑΦΜ field and
         routes the myDATA submission through invoiceType 1.1
         with the buyer as <counterpart>. Cross-field validation
         on step2Schema enforces that INVOICE requires a valid
         9-digit ΑΦΜ before the step can advance.

         The step mounts it only with the ``b2bInvoicing`` feature,
         so the owner can hide the entire Τιμολόγιο flow from admin
         without a deploy. The Django serializer also rejects
         ``INVOICE`` when it is off, so a direct API call can't
         bypass the UI. -->
    <UCheckbox
      :model-value="formState.documentType === 'INVOICE'"
      :label="t('form.invoice.toggle_label')"
      :description="t('form.invoice.toggle_description')"
      color="primary"
      @update:model-value="(v) => setDocumentType(formState, v ? 'INVOICE' : 'RECEIPT')"
    />
    <template v-if="formState.documentType === 'INVOICE'">
      <UFormField
        :label="t('form.invoice.company_label')"
        name="billingCompanyName"
        required
      >
        <UInput
          v-model="formState.billingCompanyName"
          size="xl"
          leading-icon="i-heroicons-building-office-2"
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
            size="xl"
            placeholder="123456789"
            leading-icon="i-heroicons-identification"
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
            size="xl"
            leading-icon="i-heroicons-building-library"
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
          size="xl"
          leading-icon="i-heroicons-briefcase"
          maxlength="255"
          class="w-full"
        />
      </UFormField>
      <!-- "Same as delivery" is a home delivery's: a pickup point is
           no company's address, so a pickup invoice names its own. -->
      <UCheckbox
        v-if="formState.shippingMethod === 'home_delivery'"
        v-model="formState.billingSameAsShipping"
        :label="t('form.invoice.billing_same_label')"
        :description="t('form.invoice.billing_same_description')"
        color="primary"
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
              size="xl"
              maxlength="255"
              class="w-full"
              icon="i-heroicons-map-pin"
            />
          </UFormField>
          <UFormField
            :label="t('form.invoice.billing_street_number_label')"
            name="billingStreetNumber"
            required
          >
            <UInput
              v-model="formState.billingStreetNumber"
              size="xl"
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
              size="xl"
              maxlength="100"
              class="w-full"
              icon="i-heroicons-building-office-2"
            />
          </UFormField>
          <UFormField
            :label="t('form.invoice.billing_zipcode_label')"
            name="billingZipcode"
            required
          >
            <UInput
              v-model="formState.billingZipcode"
              size="xl"
              maxlength="20"
              class="w-full"
            />
          </UFormField>
        </div>
      </template>
    </template>
  </div>
</template>
