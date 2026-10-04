<script lang="ts" setup>
/**
 * What steps 1 and 2 chose, read back before the shopper pays: how to
 * reach them, where the order goes and which document they get. It only
 * reads `formState`; changing any of it is the stepper's job.
 */
const props = defineProps<{
  formState: Record<string, any>
}>()

const { t } = useI18n()

// The checkout's shipping-method labels (the same copy the delivery step
// shows), keyed by the method the form holds.
const METHOD_LABEL_KEYS: Record<string, string> = {
  home_delivery: 'shipping.method.home_delivery.label',
  box_now_locker: 'shipping.method.boxnow.label',
  acs_smartpoint: 'shipping.method.acs_smartpoint.label',
}

const join = (parts: unknown[], separator: string) =>
  parts.filter(part => typeof part === 'string' && part.trim()).join(separator)

const contact = computed(() => [props.formState.email, props.formState.phone].filter(Boolean) as string[])

const deliveryTitle = computed(() => {
  const key = METHOD_LABEL_KEYS[props.formState.shippingMethod]
  return key ? t(key) : ''
})

// Where it goes: the picked locker, or the street address for a courier.
const deliveryDetail = computed(() => {
  const { shippingMethod, boxnowLocker, acsStation, street, streetNumber, zipcode, city } = props.formState
  if (shippingMethod === 'box_now_locker') {
    return join([boxnowLocker?.boxnowLockerName, boxnowLocker?.boxnowLockerAddressLine1], ' · ')
  }
  if (shippingMethod === 'acs_smartpoint') {
    return join([acsStation?.name, acsStation?.addressLine1], ' · ')
  }
  return join([join([street, streetNumber], ' '), join([zipcode, city], ' ')], ', ')
})

const isInvoice = computed(() => props.formState.documentType === 'INVOICE')

const documentLine = computed(() => isInvoice.value
  ? join([
      props.formState.billingCompanyName,
      props.formState.billingVatId ? t('vat_id', { id: props.formState.billingVatId }) : '',
    ], ' · ')
  : join([props.formState.firstName, props.formState.lastName], ' '))
</script>

<template>
  <dl class="grid gap-x-8 gap-y-5 sm:grid-cols-2">
    <div class="flex flex-col gap-1">
      <dt class="text-xs font-semibold tracking-wider text-muted uppercase">
        {{ t('contact') }}
      </dt>
      <dd
        v-for="line in contact"
        :key="line"
        class="text-highlighted"
      >
        {{ line }}
      </dd>
    </div>

    <div class="flex flex-col gap-1">
      <dt class="text-xs font-semibold tracking-wider text-muted uppercase">
        {{ t('delivery') }}
      </dt>
      <dd class="text-highlighted">
        {{ deliveryTitle }}
      </dd>
      <dd
        v-if="deliveryDetail"
        class="text-highlighted"
      >
        {{ deliveryDetail }}
      </dd>
    </div>

    <div class="flex flex-col gap-1 sm:col-span-2">
      <dt class="text-xs font-semibold tracking-wider text-muted uppercase">
        {{ isInvoice ? t('invoice') : t('receipt') }}
      </dt>
      <dd class="text-highlighted">
        {{ documentLine }}
      </dd>
    </div>
  </dl>
</template>

<i18n lang="yaml">
el:
  contact: Επικοινωνία
  delivery: Παράδοση
  invoice: Τιμολόγιο
  receipt: Απόδειξη
  vat_id: "ΑΦΜ {id}"
en:
  contact: Contact
  delivery: Delivery
  invoice: Invoice
  receipt: Receipt
  vat_id: "VAT {id}"
</i18n>
