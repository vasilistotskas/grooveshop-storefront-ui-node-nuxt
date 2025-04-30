<script lang="ts" setup>
import * as z from 'zod'

const { fetch } = useUserSession()

const cartStore = useCartStore()
const { cleanCartState } = cartStore
const { getCartItems } = storeToRefs(cartStore)

const { t, locale } = useI18n({ useScope: 'local' })
const toast = useToast()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const shippingPrice = ref(3)
const regions = ref<Pagination<Region> | null>(null)
const formRef = useTemplateRef('formRef')
const { data: countries } = await useFetch<Pagination<Country>>(
  '/api/countries',
  {
    key: 'countries',
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      language: locale,
    },
  },
)
const { data: payWays } = await useFetch<Pagination<PayWay>>(
  '/api/pay-way',
  {
    key: 'payWays',
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      language: locale,
    },
  },
)

const fetchRegions = async () => {
  try {
    regions.value = await $fetch<Pagination<Region>>('/api/regions', {
      method: 'GET',
      query: {
        country: formRef.value?.fields.country ? formRef.value?.fields.country[0].value : undefined,
        language: locale.value,
      },
    })
  }
  catch {
    toast.add({
      title: $i18n.t('error.default'),
      description: t('error_occurred'),
      color: 'error',
    })
  }
}

const onCountryChange = async () => {
  await fetchRegions()
}

const onSelectMenuChange = async ({ target, value }: { target: string, value: string }) => {
  if (target === 'country' && value) {
    await onCountryChange()
  }
}

async function onSubmit(values: OrderCreateBody) {
  const updatedValues = processValues(values)
  await $fetch<OrderCreateResponse>('/api/orders', {
    method: 'POST',
    headers: useRequestHeaders(),
    body: updatedValues,
    async onResponse({ response }) {
      if (!response.ok) {
        return
      }
      toast.add({
        title: t('form.submit.success'),
        color: 'success',
      })
      cleanCartState()
      await fetch()
      await navigateTo(localePath({ name: 'checkout-success-uuid', params: { uuid: response._data.uuid } }))
    },
    onResponseError({ error }) {
      toast.add({
        title: error?.message,
        color: 'error',
      })
    },
  })
}

const countryOptions = computed(() => {
  return countries.value?.results?.map((country) => {
    const countryName = extractTranslated(country, 'name', locale.value)
    return {
      name: countryName,
      value: country.alpha2,
    }
  }) || []
})

const regionOptions = computed(() => {
  return regions.value?.results?.map((region) => {
    const regionName = extractTranslated(region, 'name', locale.value)
    return {
      name: regionName,
      value: region.alpha,
    }
  }) || []
})

const payWayOptions = computed(() => {
  return payWays.value?.results?.map((payWay) => {
    const payWayName = extractTranslated(payWay, 'name', locale.value)
    return {
      label: `${payWayName} (${payWay.cost})`,
      value: payWay.id,
    }
  }) || []
})

const formSchema = computed(() => ({
  steps: [
    {
      title: t('steps.personal_info'),
      description: t('steps.personal_info_desc'),
      icon: 'i-heroicons-user-circle',
      fields: [
        {
          name: 'firstName',
          label: t('form.first_name'),
          as: 'input',
          type: 'text',
          required: true,
          readonly: false,
          placeholder: t('form.first_name'),
          autocomplete: 'given-name',
          rules: z.string({ required_error: $i18n.t('validation.required') }).min(3, t('validation.first_name.min', { min: 3 })),
        },
        {
          name: 'lastName',
          label: t('form.last_name'),
          as: 'input',
          type: 'text',
          required: true,
          readonly: false,
          placeholder: t('form.last_name'),
          autocomplete: 'family-name',
          rules: z.string({ required_error: $i18n.t('validation.required') }).min(3, t('validation.last_name.min', { min: 3 })),
        },
        {
          name: 'email',
          label: t('form.email'),
          as: 'input',
          type: 'email',
          required: true,
          readonly: false,
          placeholder: t('form.email'),
          autocomplete: 'email',
          rules: z.string({ required_error: $i18n.t('validation.required') }).email($i18n.t('validation.email.valid')),
        },
        {
          name: 'phone',
          label: t('form.phone'),
          as: 'input',
          type: 'text',
          required: true,
          readonly: false,
          placeholder: t('form.phone'),
          autocomplete: 'tel',
          rules: z.string({ required_error: $i18n.t('validation.required') }).min(3, t('validation.phone.min', { min: 3 })),
        },
      ],
    },
    {
      title: t('steps.address'),
      description: t('steps.address_desc'),
      icon: 'i-heroicons-map-pin',
      fields: [
        {
          name: 'country',
          label: t('form.country'),
          as: 'select',
          type: 'text',
          required: true,
          readonly: false,
          placeholder: defaultSelectOptionChoose,
          autocomplete: 'country',
          children: (countryOptions.value || []).map(option => ({
            tag: 'option',
            text: option.name || '',
            as: 'option',
            label: option.name,
            value: option.value,
          })),
          rules: z.string({ required_error: $i18n.t('validation.required') }),
          initialValue: defaultSelectOptionChoose,
          condition: () => true,
          disabledCondition: () => false,
        },
        {
          name: 'region',
          label: t('form.region'),
          as: 'select',
          type: 'text',
          required: true,
          readonly: false,
          placeholder: defaultSelectOptionChoose,
          autocomplete: 'address-level1',
          children: (regionOptions.value || []).map(option => ({
            tag: 'option',
            text: option.name || '',
            as: 'option',
            label: option.name,
            value: option.value,
          })),
          rules: z.string({ required_error: $i18n.t('validation.required') }),
          condition: () => true,
          disabledCondition: () => false,
        },
        {
          name: 'city',
          label: t('form.city'),
          as: 'input',
          type: 'text',
          required: true,
          readonly: false,
          placeholder: t('form.city'),
          autocomplete: 'address-level2',
          rules: z.string({ required_error: $i18n.t('validation.required') }).min(3, t('validation.city.min', { min: 3 })),
        },
        {
          name: 'place',
          label: t('form.place'),
          as: 'input',
          type: 'text',
          required: true,
          readonly: false,
          placeholder: t('form.place'),
          autocomplete: 'address-level2',
          rules: z.string({ required_error: $i18n.t('validation.required') }).min(3, t('validation.place.min', { min: 3 })),
        },
        {
          name: 'zipcode',
          label: t('form.zipcode'),
          as: 'input',
          type: 'text',
          required: true,
          readonly: false,
          placeholder: t('form.zipcode'),
          autocomplete: 'postal-code',
          rules: z.string({ required_error: $i18n.t('validation.required') }).min(3, t('validation.zipcode.min', { min: 3 })),
        },
        {
          name: 'street',
          label: t('form.street'),
          as: 'input',
          type: 'text',
          required: true,
          readonly: false,
          placeholder: t('form.street'),
          autocomplete: 'address-line1',
          rules: z.string({ required_error: $i18n.t('validation.required') }).min(3, t('validation.street.min', { min: 3 })),
        },
        {
          name: 'streetNumber',
          label: t('form.street_number'),
          as: 'input',
          type: 'text',
          required: true,
          readonly: false,
          placeholder: t('form.street_number'),
          autocomplete: 'address-line2',
          rules: z.string({ required_error: $i18n.t('validation.required') }).min(1, t('validation.street_number.min', { min: 1 })),
        },
        {
          name: 'floor',
          label: t('form.floor'),
          as: 'select',
          type: 'text',
          required: false,
          readonly: false,
          placeholder: defaultSelectOptionChoose,
          autocomplete: 'off',
          children: floorChoicesList.map(option => ({
            tag: 'option',
            text: option.name || '',
            as: 'option',
            label: option.name,
            value: option.value,
          })),
          rules: z.union([z.nativeEnum(FloorChoicesEnum), z.string()]).optional(),
        },
        {
          name: 'locationType',
          label: t('form.location_type'),
          as: 'select',
          type: 'text',
          required: false,
          readonly: false,
          placeholder: defaultSelectOptionChoose,
          autocomplete: 'off',
          children: locationChoicesList.map(option => ({
            tag: 'option',
            text: option.name || '',
            as: 'option',
            label: option.name,
            value: option.value,
          })),
          rules: z.union([z.nativeEnum(LocationChoicesEnum), z.string()]).optional(),
        },
        {
          name: 'customerNotes',
          label: t('form.customer_notes'),
          as: 'textarea',
          type: 'text',
          required: false,
          readonly: false,
          placeholder: t('form.customer_notes'),
          autocomplete: 'off',
          rules: z.string().optional(),
        },
      ],
    },
    {
      title: t('steps.payment'),
      description: t('steps.payment_desc'),
      icon: 'i-heroicons-credit-card',
      fields: [
        {
          name: 'payWay',
          label: t('form.payment_method'),
          as: 'radio',
          type: 'text',
          required: true,
          readonly: false,
          placeholder: '',
          autocomplete: 'off',
          items: payWayOptions.value,
        },
        {
          name: 'documentType',
          label: t('form.document_type.label'),
          as: 'radio',
          type: 'text',
          required: true,
          readonly: false,
          placeholder: '',
          autocomplete: 'off',
          items: [
            {
              label: t('form.document_type.receipt.label'),
              value: ZodDocumentTypeEnum.enum.RECEIPT,
            },
            {
              label: t('form.document_type.invoice.label'),
              value: ZodDocumentTypeEnum.enum.INVOICE,
            },
          ],
          rules: z.string({ required_error: $i18n.t('validation.required') }),
        },
        {
          name: 'items',
          hidden: true,
          readonly: true,
          type: 'text',
          as: 'input',
          autocomplete: 'off',
          required: true,
          placeholder: '',
          initialValue: getCartItems.value.map(item => ({
            id: item.id,
            product: item.product.id,
            price: item.product.finalPrice,
            quantity: item.quantity,
          })),
          rules: z.array(z.any()),
        },
        {
          name: 'shippingPrice',
          hidden: true,
          readonly: true,
          type: 'number',
          as: 'input',
          autocomplete: 'off',
          required: true,
          placeholder: '',
          initialValue: shippingPrice.value,
          rules: z.number({ required_error: $i18n.t('validation.required') }),
        },
      ],
    },
  ],
} satisfies DynamicFormSchema))

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="max-w-(--container-6xl)">
    <UBreadcrumb
      :items="[
        {
          label: t('home'),
          to: localePath('index'),
          icon: 'i-heroicons-home',
        },
        {
          label: t('shopping_cart'),
          to: localePath('cart'),
          icon: 'i-heroicons-shopping-cart',
        },
        {
          label: t('title'),
          to: localePath('checkout'),
          icon: 'i-heroicons-credit-card',
        },
      ]"
      divider="chevron"
      class="mb-8"
    />

    <div class="flex flex-col lg:flex-row gap-8">
      <div class="flex-1">
        <DynamicForm
          ref="formRef"
          :button-label="$i18n.t('submit')"
          :schema="formSchema"
          :loading="false"
          class="h-full rounded-[calc(var(--ui-radius)*2)] bg-(--ui-bg) ring ring-(--ui-border) divide-y divide-(--ui-border) w-full p-4"
          @submit="onSubmit"
          @select-menu-change="onSelectMenuChange"
        />
      </div>

      <div class="w-full lg:w-[400px]">
        <CheckoutSidebar
          :shipping-price="shippingPrice"
        >
          <template #items>
            <CheckoutItems />
          </template>
        </CheckoutSidebar>
      </div>
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Ολοκλήρωση αγοράς
  home: Αρχική
  shopping_cart: Καλάθι Αγορών
  steps:
    personal_info: Προσωπικά Στοιχεία
    personal_info_desc: Συμπληρώστε τα προσωπικά σας στοιχεία
    address: Διεύθυνση
    address_desc: Συμπληρώστε τη διεύθυνση παράδοσης
    payment: Πληρωμή
    payment_desc: Επίλεξε τον τρόπο πληρωμής
  form:
    first_name: Ονομα
    last_name: Επίθετο
    email: Email
    phone: Τηλέφωνο
    place: Περιοχή
    city: Πόλη
    zipcode: Ταχυδρομικός Κώδικας
    country: Χώρα
    region: Περιφέρεια
    mobile_phone: Κινητό τηλέφωνο
    floor: Πάτωμα
    location_type: Τύπος τοποθεσίας
    street: Οδός
    street_number: Αριθμός Οδού
    customer_notes: Σημειώσεις
    payment_method: Τρόπος πληρωμής
    document_type:
      label: Χρειάζεσαι απόδειξη ή τιμολόγιο;
      receipt:
        label: Απόδειξη
      invoice:
        label: Τιμολόγιο
    submit:
      title: Αποθήκευση
      success: Η παραγγελία δημιουργήθηκε με επιτυχία
      error: Σφάλμα δημιουργίας παραγγελίας
  validation:
    required: Το πεδίο είναι υποχρεωτικό
    email:
      required: Απαιτείται email
      email: Το email πρέπει να είναι έγκυρο
    first_name:
      min: Το όνομα πρέπει να έχει τουλάχιστον {min} χαρακτήρες
    last_name:
      min: Το επώνυμο πρέπει να έχει τουλάχιστον {min} χαρακτήρες
    street:
      min: Η οδός πρέπει να έχει τουλάχιστον {min} χαρακτήρες
    street_number:
      min: Ο αριθμός οδού πρέπει να έχει τουλάχιστον {min} χαρακτήρες
    zipcode:
      min: Ο ταχυδρομικός κώδικας πρέπει να έχει μήκος τουλάχιστον {min} χαρακτήρων
    place:
      min: Το μέρος πρέπει να έχει τουλάχιστον {min} χαρακτήρες
    city:
      min: Η πόλη πρέπει να έχει τουλάχιστον {min} χαρακτήρες
    phone:
      min: Το τηλέφωνο πρέπει να έχει τουλάχιστον {min} χαρακτήρες
</i18n>
