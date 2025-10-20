<script lang="ts" setup>
import * as z from 'zod'

const { fetch } = useUserSession()
const localePath = useLocalePath()

const cartStore = useCartStore()
const { cleanCartState } = cartStore
const { getCartItems, hasStockIssues } = storeToRefs(cartStore)

if (hasStockIssues.value) {
  navigateTo(localePath('cart'))
}
const { t, locale } = useI18n()
const toast = useToast()
const { $i18n } = useNuxtApp()

const checkoutMode = ref<'embedded' | 'hosted'>('hosted')
const useHostedCheckout = computed(() => checkoutMode.value === 'hosted')
const showPaymentStep = ref(false)
const createdOrder = ref<OrderDetail | null>(null)
const selectedPayWay = ref<PayWay | null>(null)

const regions = ref<Pagination<Region> | null>(null)
const formRef = useTemplateRef('formRef')

const { data: setting } = await useFetch(
  '/api/settings/get',
  {
    key: 'CHECKOUT_SHIPPING_PRICE',
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      key: 'CHECKOUT_SHIPPING_PRICE',
    },
  },
)

const { data: countries } = await useFetch(
  '/api/countries',
  {
    key: 'countries',
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      languageCode: locale,
    },
  },
)

const { data: payWays } = await useFetch(
  '/api/pay-way',
  {
    key: 'payWays',
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      languageCode: locale,
    },
  },
)

const fetchRegions = async () => {
  try {
    regions.value = await $fetch<ListRegionResponse>('/api/regions', {
      method: 'GET',
      query: {
        country: formRef.value?.fields.country ? formRef.value?.fields.country[0].value : undefined,
        languageCode: locale.value,
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
  if (formRef.value?.fields?.region) {
    formRef.value.fields.region[0].value = defaultSelectOptionChoose
  }
  await fetchRegions()
}

const onSelectMenuChange = async ({ target, value }: { target: string, value: string }) => {
  if (target === 'country' && value) {
    await onCountryChange()
  }
}

const isStripePayment = computed(() => {
  return selectedPayWay.value?.providerCode === 'stripe'
})

const shippingPrice = computed(() => {
  if (!setting?.value) {
    return 0
  }
  return parseFloat(setting.value?.value)
})

const selectPlaceholder = computed(() => t('form.select_placeholder'))

async function onSubmit(values: any) {
  console.log('Submit values:', values)
  const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'country', 'region']
  const missingFields = requiredFields.filter(field => !values[field])

  if (missingFields.length > 0) {
    return
  }

  payWays.value?.results?.forEach((pw) => {
    if (pw.id === values.payWay) {
      selectedPayWay.value = pw
    }
  })

  const submitValues: OrderWriteRequest = {
    ...values,
    floor: values.floor === defaultSelectOptionChoose ? undefined : values.floor,
    locationType: values.locationType === defaultSelectOptionChoose ? undefined : values.locationType,
    country: values.country === defaultSelectOptionChoose ? undefined : values.country,
    region: values.region === defaultSelectOptionChoose ? undefined : values.region,
    mobilePhone: values.phone,
  }

  await $fetch('/api/orders', {
    method: 'POST',
    headers: useRequestHeaders(),
    body: submitValues,
    async onResponse({ response }) {
      if (!response.ok) {
        return
      }

      createdOrder.value = response._data

      if (isStripePayment.value) {
        showPaymentStep.value = true

        toast.add({
          title: t('order_created_payment_required'),
          description: t('complete_payment_to_finish'),
          color: 'info',
        })
      }
      else {
        toast.add({
          title: t('form.submit.success'),
          color: 'success',
        })
        cleanCartState()
        await fetch()
        await navigateTo(localePath({
          name: 'checkout-success-uuid',
          params: { uuid: response._data.uuid },
        }))
      }
    },
    onResponseError({ response }) {
      handleOrderError(response)
    },
  })
}

const handleOrderError = (response: any) => {
  let errorTitle = t('form.submit.error.general')
  let errorDescription = undefined

  if (response._data?.data?.items && Array.isArray(response._data.data.items)) {
    const stockErrors: string[] = []

    response._data.data.items.forEach((item: any) => {
      if (item?.quantity && Array.isArray(item.quantity)) {
        item.quantity.forEach((error: string) => {
          stockErrors.push(error)
        })
      }
    })

    if (stockErrors.length > 0) {
      errorTitle = t('form.submit.error.inventory')
      errorDescription = stockErrors.join('. ')
    }
  }
  else if (response._data?.message) {
    errorTitle = t('form.submit.error.general')
    errorDescription = response._data.message
  }
  else if (response._data?.errors) {
    errorTitle = t('form.submit.error.validation')
    errorDescription = Object.values(response._data.errors).flat().join('. ')
  }
  else if (response._data.data.nonFieldErrors && Array.isArray(response._data.data.nonFieldErrors)) {
    errorTitle = t('form.submit.error.general')
    response._data.data.nonFieldErrors.forEach((error: string) => {
      errorDescription = error
    })
  }

  toast.add({
    title: errorTitle,
    description: errorDescription,
    color: 'error',
  })
}

const onPaymentSuccess = async (paymentData: any) => {
  console.log('Payment success', paymentData)

  toast.add({
    title: t('payment_successful'),
    description: t('order_completed_successfully'),
    color: 'success',
  })

  cleanCartState()
  await fetch()
  await navigateTo(localePath({
    name: 'checkout-success-uuid',
    params: { uuid: createdOrder.value?.uuid },
  }))
}

const onPaymentError = (error: string) => {
  toast.add({
    title: t('payment_failed'),
    description: error,
    color: 'error',
  })
}

const onPaymentReady = () => {
  // Payment component is ready
}

const backToForm = () => {
  showPaymentStep.value = false
  createdOrder.value = null
  selectedPayWay.value = null
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

const floorChoicesList = computed(() => [
  {
    name: t('form.floor_options.BASEMENT'),
    value: 'BASEMENT',
  },
  {
    name: t('form.floor_options.GROUND_FLOOR'),
    value: 'GROUND_FLOOR',
  },
  {
    name: t('form.floor_options.FIRST_FLOOR'),
    value: 'FIRST_FLOOR',
  },
  {
    name: t('form.floor_options.SECOND_FLOOR'),
    value: 'SECOND_FLOOR',
  },
  {
    name: t('form.floor_options.THIRD_FLOOR'),
    value: 'THIRD_FLOOR',
  },
  {
    name: t('form.floor_options.FOURTH_FLOOR'),
    value: 'FOURTH_FLOOR',
  },
  {
    name: t('form.floor_options.FIFTH_FLOOR'),
    value: 'FIFTH_FLOOR',
  },
  {
    name: t('form.floor_options.SIXTH_FLOOR_PLUS'),
    value: 'SIXTH_FLOOR_PLUS',
  },
])

const locationChoicesList = computed(() => [
  {
    name: t('form.location_type_options.HOME'),
    value: 'HOME',
  },
  {
    name: t('form.location_type_options.OFFICE'),
    value: 'OFFICE',
  },
  {
    name: t('form.location_type_options.OTHER'),
    value: 'OTHER',
  },
])

const formSchema = computed<DynamicFormSchema>(() => ({
  steps: [
    {
      title: t('steps.personal_info'),
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
          condition: null,
          disabledCondition: null,
          rules: z.string({ error: issue => issue.input === undefined
            ? $i18n.t('validation.required')
            : $i18n.t('validation.first_name.min', { min: 3 }) }),
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
          condition: null,
          disabledCondition: null,
          rules: z.string({ error: issue => issue.input === undefined
            ? $i18n.t('validation.required')
            : $i18n.t('validation.last_name.min', { min: 3 }) }),
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
          condition: null,
          disabledCondition: null,
          rules: z.string({ error: issue => issue.input === undefined
            ? $i18n.t('validation.required')
            : $i18n.t('validation.email.valid') }),
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
          condition: null,
          disabledCondition: null,
          rules: z.string({ error: issue => issue.input === undefined
            ? $i18n.t('validation.required')
            : $i18n.t('validation.phone.min', { min: 3 }) }),
        },
      ],
    },
    {
      title: t('steps.address'),
      icon: 'i-heroicons-map-pin',
      fields: [
        {
          name: 'country',
          label: t('form.country'),
          as: 'select',
          type: 'text',
          required: true,
          readonly: false,
          placeholder: selectPlaceholder.value,
          autocomplete: 'country',
          children: [
            {
              tag: 'option',
              text: selectPlaceholder.value,
              as: 'option',
              label: selectPlaceholder.value,
              value: defaultSelectOptionChoose,
              disabled: true,
            },
            ...(countryOptions.value || []).map(option => ({
              tag: 'option',
              text: option.name || '',
              as: 'option',
              label: option.name,
              value: option.value,
            })),
          ],
          rules: z.string()
            .refine(val => val !== defaultSelectOptionChoose, {
              message: $i18n.t('validation.required'),
            }),
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
          placeholder: selectPlaceholder.value,
          autocomplete: 'address-level1',
          children: [
            {
              tag: 'option',
              text: selectPlaceholder.value,
              as: 'option',
              label: selectPlaceholder.value,
              value: defaultSelectOptionChoose,
              disabled: true,
            },
            ...(regionOptions.value || []).map(option => ({
              tag: 'option',
              text: option.name || '',
              as: 'option',
              label: option.name,
              value: option.value,
            })),
          ],
          rules: z.string()
            .refine(val => val !== defaultSelectOptionChoose, {
              message: $i18n.t('validation.required'),
            }),
          initialValue: defaultSelectOptionChoose,
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
          condition: null,
          disabledCondition: null,
          rules: z.string({ error: issue => issue.input === undefined
            ? $i18n.t('validation.required')
            : $i18n.t('validation.city.min', { min: 3 }) }),
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
          condition: null,
          disabledCondition: null,
          rules: z.string({ error: issue => issue.input === undefined
            ? $i18n.t('validation.required')
            : $i18n.t('validation.place.min', { min: 3 }) }),
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
          condition: null,
          disabledCondition: null,
          rules: z.string({ error: issue => issue.input === undefined
            ? $i18n.t('validation.required')
            : $i18n.t('validation.zipcode.min', { min: 3 }) }),
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
          condition: null,
          disabledCondition: null,
          rules: z.string({ error: issue => issue.input === undefined
            ? $i18n.t('validation.required')
            : $i18n.t('validation.street.min', { min: 3 }) }),
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
          condition: null,
          disabledCondition: null,
          rules: z.string({ error: issue => issue.input === undefined
            ? $i18n.t('validation.required')
            : $i18n.t('validation.street_number.min', { min: 1 }) }),
        },
        {
          name: 'floor',
          label: t('form.floor'),
          as: 'select',
          type: 'text',
          required: false,
          readonly: false,
          placeholder: selectPlaceholder.value,
          autocomplete: 'off',
          condition: null,
          disabledCondition: null,
          children: [
            {
              tag: 'option',
              text: selectPlaceholder.value,
              as: 'option',
              label: selectPlaceholder.value,
              value: defaultSelectOptionChoose,
              disabled: true,
            },
            ...floorChoicesList.value.map(option => ({
              tag: 'option',
              text: option.name || '',
              as: 'option',
              label: option.name,
              value: option.value,
            })),
          ],
          rules: z.union([zFloorEnum, z.string()]).optional(),
        },
        {
          name: 'locationType',
          label: t('form.location_type'),
          as: 'select',
          type: 'text',
          required: false,
          readonly: false,
          placeholder: selectPlaceholder.value,
          autocomplete: 'off',
          condition: null,
          disabledCondition: null,
          children: [
            {
              tag: 'option',
              text: selectPlaceholder.value,
              as: 'option',
              label: selectPlaceholder.value,
              value: defaultSelectOptionChoose,
              disabled: true,
            },
            ...locationChoicesList.value.map(option => ({
              tag: 'option',
              text: option.name || '',
              as: 'option',
              label: option.name,
              value: option.value,
            })),
          ],
          rules: z.union([zLocationTypeEnum, z.string()]).optional(),
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
          condition: null,
          disabledCondition: null,
          rules: z.string().optional(),
        },
      ],
    },
    {
      title: t('steps.payment'),
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
          condition: null,
          disabledCondition: null,
          initialValue: payWayOptions.value?.[0]?.value || '',
          color: 'success',
          rules: z.number().min(1, {
            message: $i18n.t('validation.payment_method.required'),
          }),
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
          condition: null,
          disabledCondition: null,
          hidden: true,
          initialValue: zDocumentTypeEnum.enum.RECEIPT,
          items: [
            {
              label: t('form.document_type.receipt.label'),
              value: zDocumentTypeEnum.enum.RECEIPT,
            },
            {
              label: t('form.document_type.invoice.label'),
              value: zDocumentTypeEnum.enum.INVOICE,
            },
          ],
          rules: z.string({ error: issue => issue.input === undefined
            ? $i18n.t('validation.required')
            : $i18n.t('validation.string.invalid') }),
        },
        {
          name: 'items',
          hidden: true,
          readonly: true,
          type: 'text',
          as: 'input',
          autocomplete: 'off',
          condition: null,
          disabledCondition: null,
          required: true,
          placeholder: '',
          initialValue: getCartItems.value.map(item => ({
            product: item.product.id,
            quantity: item.quantity,
          })),
          rules: z.array(z.any()),
        },
      ],
    },
  ],
} satisfies DynamicFormSchema))

defineRouteRules({
  robots: false,
})

definePageMeta({
  layout: 'default',
  middleware: [
    async function () {
      const { $i18n } = useNuxtApp()
      const localePath = useLocalePath()
      const toast = useToast()
      let cart: CartDetail | null = null
      try {
        cart = await $fetch('/api/cart', {
          method: 'GET',
          headers: useRequestHeaders(),
        })
      }
      catch {
        toast.add({
          title: $i18n.t('error.default'),
          description: $i18n.t('error_occurred'),
          color: 'error',
        })
        return navigateTo(localePath('index'))
      }

      if (!cart?.items || cart?.items.length === 0) {
        toast.add({
          title: $i18n.t('cart_empty'),
          color: 'error',
        })
        return navigateTo(localePath('index'))
      }
    },
  ],
})
</script>

<template>
  <PageWrapper class="max-w-(--container-6xl)">
    <div
      class="
        flex flex-col gap-8 pt-2
        md:pt-4
        lg:flex-row
      "
    >
      <div class="flex-1">
        <div v-if="!showPaymentStep" class="h-full">
          <DynamicForm
            ref="formRef"
            :button-label="$i18n.t('submit')"
            :schema="formSchema"
            :loading="false"
            class="
              h-full w-full divide-y divide-(--ui-border)
              rounded-[calc(var(--ui-radius)*2)] bg-(--ui-bg) p-4 ring
              ring-(--ui-border)
            "
            @submit="onSubmit"
            @select-menu-change="onSelectMenuChange"
          />
        </div>

        <UCard v-else class="h-full" variant="soft">
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold">
                  {{ t('complete_payment') }}
                </h2>
                <p
                  class="
                    text-sm text-primary-950
                    dark:text-primary-50
                  "
                >
                  {{ t('order_created_complete_payment') }}
                </p>
              </div>
              <UButton
                variant="ghost"
                icon="i-heroicons-arrow-left"
                @click="backToForm"
              >
                {{ t('back_to_form') }}
              </UButton>
            </div>
          </template>

          <div class="space-y-6">
            <div class="rounded-lg bg-elevated/70 p-4">
              <h3 class="mb-2 font-medium">
                {{ t('order_summary') }}
              </h3>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span>{{ t('order_number') }}:</span>
                  <span class="font-medium">#{{ createdOrder?.id }}</span>
                </div>
                <div class="flex justify-between">
                  <span>{{ t('total_amount') }}:</span>
                  <span class="font-medium">
                    {{ createdOrder?.pricingBreakdown?.grandTotal }}
                    {{ createdOrder?.pricingBreakdown?.currency }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span>{{ t('payment_method') }}:</span>
                  <span class="font-medium">{{ extractTranslated(selectedPayWay, 'name', locale) }}</span>
                </div>
              </div>
            </div>

            <StripeCheckout
              v-if="isStripePayment && useHostedCheckout && createdOrder && selectedPayWay"
              :order="createdOrder"
              :pay-way="selectedPayWay"
              @error="onPaymentError"
              @redirecting="() => toast.add({ title: t('redirecting'), color: 'info' })"
            />

            <StripePayment
              v-else-if="isStripePayment && !useHostedCheckout && createdOrder && selectedPayWay"
              ref="stripePaymentRef"
              :order="createdOrder"
              :pay-way="selectedPayWay"
              @success="onPaymentSuccess"
              @error="onPaymentError"
              @ready="onPaymentReady"
            />

            <p
              v-else class="
                text-center text-primary-950
                dark:text-primary-50
              "
            >
              {{ t('payment_method_not_supported_online') }}
            </p>
          </div>
        </UCard>
      </div>

      <div
        class="
          w-full
          lg:w-[400px]
        "
      >
        <CheckoutSidebar :shipping-price="shippingPrice">
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
  complete_payment: Ολοκλήρωση Πληρωμής
  order_created_complete_payment: Η παραγγελία δημιουργήθηκε. Ολοκλήρωσε την πληρωμή για να ολοκληρώσεις την παραγγελία.
  order_created_payment_required: Παραγγελία δημιουργήθηκε
  complete_payment_to_finish: Ολοκληρώστε την πληρωμή για να ολοκληρώσεις την παραγγελία
  back_to_form: Επιστροφή
  order_summary: Σύνοψη Παραγγελίας
  order_number: Αριθμός παραγγελίας
  total_amount: Συνολικό ποσό
  payment_method: Τρόπος πληρωμής
  payment_method_not_supported_online: Αυτός ο τρόπος πληρωμής δεν υποστηρίζεται για online πληρωμές
  payment_successful: Η πληρωμή ολοκληρώθηκε με επιτυχία
  order_completed_successfully: Η παραγγελία ολοκληρώθηκε με επιτυχία
  payment_failed: Η πληρωμή απέτυχε
  redirecting: Μεταφορά στην σελίδα πληρωμής
  steps:
    personal_info: Προσωπικά Στοιχεία
    address: Διεύθυνση
    payment: Πληρωμή
  form:
    select_placeholder: Επέλεξε
    first_name: Όνομα
    last_name: Επίθετο
    email: Email
    phone: Τηλέφωνο
    place: Περιοχή
    city: Πόλη
    zipcode: Ταχυδρομικός Κώδικας
    country: Χώρα
    region: Περιφέρεια
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
    location_type: Τύπος τοποθεσίας
    location_type_options:
      HOME: Κατοικία
      OFFICE: Γραφείο
      OTHER: Άλλο
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
      error:
        general: Σφάλμα δημιουργίας παραγγελίας
        inventory: Ανεπαρκές απόθεμα διαθέσιμο
        validation: Παρακαλώ έλεγξε τα στοιχεία της φόρμας
  validation:
    required: Το πεδίο είναι υποχρεωτικό
    email:
      valid: Το email πρέπει να είναι έγκυρο
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
    string:
      invalid: Μη έγκυρη τιμή
</i18n>
