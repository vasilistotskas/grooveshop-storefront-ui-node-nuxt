<script lang="ts" setup>
import * as z from 'zod'

const { fetch } = useUserSession()
const localePath = useLocalePath()

const cartStore = useCartStore()
const { cleanCartState } = cartStore
const { getCartItems, hasStockIssues, cart } = storeToRefs(cartStore)

if (hasStockIssues.value) {
  navigateTo(localePath('cart'))
}

const { t, n, locale } = useI18n()
const toast = useToast()
const { $i18n } = useNuxtApp()

// State management
const currentStep = ref(0) // UStepper uses 0-based indexing
const checkoutMode = ref<'embedded' | 'hosted'>('hosted')
const useHostedCheckout = computed(() => checkoutMode.value === 'hosted')
const createdOrder = ref<OrderDetail | null>(null)
const selectedPayWay = useState<PayWay | null>('selectedPayWay', () => null)
const isSubmitting = ref(false)

// Form state
const formState = reactive({
  // Personal Info
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  // Address
  country: '',
  region: '',
  city: '',
  place: '',
  zipcode: '',
  street: '',
  streetNumber: '',
  customerNotes: '',
  // Payment
  payWay: undefined as number | undefined,
  documentType: zDocumentTypeEnum.enum.RECEIPT,
  items: getCartItems.value.map(item => ({
    product: item.product.id,
    quantity: item.quantity,
  })),
})

const regions = ref<Pagination<Region> | null>(null)

// Fetch data
const { data: setting } = await useFetch('/api/settings/get', {
  key: 'CHECKOUT_SHIPPING_PRICE',
  method: 'GET',
  headers: useRequestHeaders(),
  query: { key: 'CHECKOUT_SHIPPING_PRICE' },
})

const { data: countries } = await useFetch('/api/countries', {
  key: 'countries',
  method: 'GET',
  headers: useRequestHeaders(),
  query: { languageCode: locale },
})

const { data: payWays } = await useFetch('/api/pay-way', {
  key: 'payWays',
  method: 'GET',
  headers: useRequestHeaders(),
  query: { languageCode: locale },
})

// Initialize payment method
if (payWays.value?.results?.[0]) {
  formState.payWay = payWays.value.results[0].id
  selectedPayWay.value = payWays.value.results[0]
}

// Initialize first country and fetch its regions on mount
onMounted(async () => {
  if (countries.value?.results?.[0] && !formState.country) {
    formState.country = countries.value.results[0].alpha2
    await fetchRegions()
  }
})

// Watch for payment method changes and update selectedPayWay
watch(() => formState.payWay, (newPayWayId) => {
  if (newPayWayId && payWays.value?.results) {
    const payWay = payWays.value.results.find(pw => pw.id === newPayWayId)
    if (payWay) {
      selectedPayWay.value = payWay
    }
  }
})

// Computed properties
const shippingPrice = computed(() => {
  if (!setting?.value) return 0
  return parseFloat(setting.value?.value)
})

const isStripePayment = computed(() => {
  return selectedPayWay.value?.providerCode === 'stripe'
})

const countryOptions = computed(() => {
  return countries.value?.results?.map(country => ({
    label: extractTranslated(country, 'name', locale.value),
    value: country.alpha2,
  })) || []
})

const regionOptions = computed(() => {
  return regions.value?.results?.map(region => ({
    label: extractTranslated(region, 'name', locale.value),
    value: region.alpha,
  })) || []
})

const payWayOptions = computed(() => {
  return payWays.value?.results?.map((payWay) => {
    const payWayName = extractTranslated(payWay, 'name', locale.value)
    let payWayNameLocalized = payWayName // fallback to original name

    if (payWayName === 'PAY_ON_DELIVERY') {
      payWayNameLocalized = t('payOnDelivery')
    }
    else if (payWayName === 'STRIPE') {
      payWayNameLocalized = t('cardPayment')
    }

    // Calculate cost display based on free threshold
    const cartTotal = cart.value?.totalPrice || 0
    const threshold = payWay.freeThreshold || 0
    const displayCost = (threshold > 0 && cartTotal >= threshold) ? 0 : payWay.cost

    return {
      label: `${payWayNameLocalized} (+${n(displayCost, 'currency')})`,
      value: payWay.id,
      mainImagePath: payWay.mainImagePath,
    }
  }) || []
})

// Validation schemas (Zod v4 syntax)
const step1Schema = z.object({
  firstName: z.string({ error: $i18n.t('validation.required') }).min(3, {
    error: $i18n.t('validation.first_name.min', { min: 3 }),
  }),
  lastName: z.string({ error: $i18n.t('validation.required') }).min(3, {
    error: $i18n.t('validation.last_name.min', { min: 3 }),
  }),
  email: z.email({ error: $i18n.t('validation.email.valid') }),
  phone: z.string({ error: $i18n.t('validation.required') }).min(3, {
    error: $i18n.t('validation.phone.min', { min: 3 }),
  }),
  country: z.string({ error: $i18n.t('validation.required') }).min(1, {
    error: $i18n.t('validation.required'),
  }),
  region: z.string({ error: $i18n.t('validation.required') }).min(1, {
    error: $i18n.t('validation.required'),
  }),
  city: z.string({ error: $i18n.t('validation.required') }).min(3, {
    error: $i18n.t('validation.city.min', { min: 3 }),
  }),
  place: z.string({ error: $i18n.t('validation.required') }).min(3, {
    error: $i18n.t('validation.place.min', { min: 3 }),
  }),
  zipcode: z.string({ error: $i18n.t('validation.required') }).min(3, {
    error: $i18n.t('validation.zipcode.min', { min: 3 }),
  }),
  street: z.string({ error: $i18n.t('validation.required') }).min(3, {
    error: $i18n.t('validation.street.min', { min: 3 }),
  }),
  streetNumber: z.string({ error: $i18n.t('validation.required') }).min(1, {
    error: $i18n.t('validation.street_number.min', { min: 1 }),
  }),
  customerNotes: z.string().optional(),
})

const step2Schema = z.object({
  payWay: z.number({ error: $i18n.t('validation.payment_method.required') }).min(1, {
    error: $i18n.t('validation.payment_method.required'),
  }),
})

// Functions
const fetchRegions = async () => {
  try {
    const countryValue = formState.country
    regions.value = await $fetch<ListRegionResponse>('/api/regions', {
      method: 'GET',
      query: {
        country: countryValue || undefined,
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
  formState.region = ''
  await fetchRegions()
}

const nextStep = async () => {
  if (currentStep.value === 0) {
    currentStep.value = 1
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
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

  toast.add({
    title: errorTitle,
    description: errorDescription,
    color: 'error',
  })
}

const onSubmit = async () => {
  if (isSubmitting.value) return

  isSubmitting.value = true

  try {
    payWays.value?.results?.forEach((pw) => {
      if (pw.id === formState.payWay) {
        selectedPayWay.value = pw
      }
    })

    const submitValues: OrderWriteRequest = {
      ...formState,
      mobilePhone: formState.phone,
    }

    await $fetch('/api/orders', {
      method: 'POST',
      headers: useRequestHeaders(),
      body: submitValues,
      async onResponse({ response }) {
        if (!response.ok) return

        createdOrder.value = response._data

        if (isStripePayment.value) {
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
  finally {
    isSubmitting.value = false
  }
}

const onPaymentSuccess = async () => {
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

const backToForm = () => {
  createdOrder.value = null
  selectedPayWay.value = null
  currentStep.value = 1
}

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
  <PageWrapper class="max-w-6xl">
    <div class="flex flex-col gap-8 pt-2 md:pt-4 lg:flex-row">
      <!-- Main Content -->
      <div class="flex-1">
        <!-- Stepper -->
        <UStepper
          v-model="currentStep"
          :items="[
            { title: t('steps.info_and_address'), icon: 'i-heroicons-user-circle' },
            { title: t('steps.payment'), icon: 'i-heroicons-credit-card' },
          ]"
          class="mb-6"
        />

        <!-- Payment Success View -->
        <UCard v-if="createdOrder && isStripePayment" variant="soft">
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold">
                  {{ t('complete_payment') }}
                </h2>
                <p class="text-sm text-primary-950 dark:text-primary-50">
                  {{ t('order_created_complete_payment') }}
                </p>
              </div>
              <UButton
                variant="ghost"
                icon="i-heroicons-arrow-left"
                size="sm"
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
              </div>
            </div>

            <StripeCheckout
              v-if="useHostedCheckout"
              :order="createdOrder"
              :pay-way="selectedPayWay!"
              @error="onPaymentError"
              @redirecting="() => toast.add({ title: t('redirecting'), color: 'info' })"
            />

            <StripePayment
              v-else
              :order="createdOrder"
              :pay-way="selectedPayWay!"
              @success="onPaymentSuccess"
              @error="onPaymentError"
            />
          </div>
        </UCard>

        <!-- Step 1: Personal Info & Address -->
        <UCard v-else-if="currentStep === 0" class="overflow-hidden">
          <template #header>
            <h2 class="text-xl font-semibold">
              {{ t('steps.info_and_address') }}
            </h2>
          </template>

          <UForm :state="formState" :schema="step1Schema" class="space-y-6" @submit="nextStep">
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
                    @update:model-value="onCountryChange"
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

            <div class="flex justify-end pt-4">
              <UButton
                type="submit"
                size="lg"
                color="success"
                icon="i-heroicons-arrow-right"
                trailing
              >
                {{ t('continue_to_payment') }}
              </UButton>
            </div>
          </UForm>
        </UCard>

        <!-- Step 2: Payment -->
        <UCard v-else-if="currentStep === 1" class="overflow-hidden">
          <template #header>
            <h2 class="text-xl font-semibold">
              {{ t('steps.payment') }}
            </h2>
          </template>

          <UForm :state="formState" :schema="step2Schema" class="space-y-6" @submit="onSubmit">
            <UFormField
              :label="t('form.payment_method')"
              name="payWay"
              required
              :ui="{
                label: `
                  text-lg font-medium text-primary-900
                  dark:text-primary-100
                `,
                wrapper: 'mb-2',
              }"
            >
              <URadioGroup
                v-model="formState.payWay"
                :items="payWayOptions"
                variant="card"
                size="xl"
                class="w-full"
                :ui="{
                  item: 'flex cursor-pointer items-center',
                  wrapper: 'ms-4',
                }"
              >
                <template #label="{ item }">
                  <div class="flex items-center justify-between gap-3">
                    <span class="font-medium">{{ item.label }}</span>
                    <div
                      v-if="item.mainImagePath"
                      class="
                        flex size-12 shrink-0 items-center justify-center
                        overflow-hidden rounded-lg
                      "
                    >
                      <ImgWithFallback
                        class="size-full object-contain dark:invert"
                        :style="{ contentVisibility: 'auto' }"
                        :src="item.mainImagePath"
                        :width="48"
                        :height="48"
                        fit="contain"
                        :format="'svg'"
                        :background="'transparent'"
                        :alt="`${item.label} payment method`"
                        densities="x1"
                      />
                    </div>
                  </div>
                </template>
              </URadioGroup>
            </UFormField>

            <div class="flex items-center justify-between pt-4">
              <UButton
                variant="ghost"
                icon="i-heroicons-arrow-left"
                type="button"
                @click="prevStep"
              >
                {{ t('back') }}
              </UButton>

              <UButton
                type="submit"
                size="lg"
                color="success"
                :loading="isSubmitting"
                :disabled="!formState.payWay"
              >
                {{ t('place_order') }}
              </UButton>
            </div>
          </UForm>
        </UCard>
      </div>

      <!-- Sidebar -->
      <div class="w-full lg:w-[400px]">
        <CheckoutSidebar
          :shipping-price="shippingPrice"
          :show-payment-fee="currentStep === 1"
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
  payOnDelivery: Αντικαταβολή
  cardPayment: Πληρωμή με κάρτα
  personal_information: Προσωπικά Στοιχεία
  delivery_address: Διεύθυνση Παράδοσης
  validation_error: Σφάλμα επικύρωσης
  continue_to_payment: Συνέχεια στην Πληρωμή
  back: Πίσω
  place_order: Ολοκλήρωση Παραγγελίας
  complete_payment: Ολοκλήρωση Πληρωμής
  order_created_complete_payment: Η παραγγελία δημιουργήθηκε. Ολοκλήρωσε την πληρωμή για να ολοκληρώσεις την παραγγελία.
  order_created_payment_required: Παραγγελία δημιουργήθηκε
  complete_payment_to_finish: Ολοκληρώστε την πληρωμή για να ολοκληρώσεις την παραγγελία
  back_to_form: Επιστροφή
  order_summary: Σύνοψη Παραγγελίας
  order_number: Αριθμός παραγγελίας
  total_amount: Συνολικό ποσό
  payment_successful: Η πληρωμή ολοκληρώθηκε με επιτυχία
  order_completed_successfully: Η παραγγελία ολοκληρώθηκε με επιτυχία
  payment_failed: Η πληρωμή απέτυχε
  redirecting: Μεταφορά στην σελίδα πληρωμής
  steps:
    info_and_address: Στοιχεία & Διεύθυνση
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
    street: Οδός
    street_number: Αριθμός Οδού
    customer_notes: Σημειώσεις
    payment_method: Τρόπος πληρωμής
    submit:
      success: Η παραγγελία δημιουργήθηκε με επιτυχία
      error:
        general: Σφάλμα δημιουργίας παραγγελίας
        inventory: Ανεπαρκές απόθεμα διαθέσιμο
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
    payment_method:
      required: Παρακαλώ επίλεξε τρόπο πληρωμής
</i18n>
