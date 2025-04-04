<script lang="ts" setup>
import { Field, useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'

const { user, fetch } = useUserSession()

const cartStore = useCartStore()
const { getCartItems } = storeToRefs(cartStore)
const { cleanCartState } = cartStore

const { t, locale } = useI18n({ useScope: 'local' })
const toast = useToast()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const UTextarea = resolveComponent('UTextarea')
const USelect = resolveComponent('USelect')

const payWay = useState<PayWay | null>('selectedPayWay')
const regions = ref<Pagination<Region> | null>(null)

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

const countryOptions = computed(() => {
  return countries.value?.results?.map((country) => {
    const countryName = extractTranslated(country, 'name', locale.value)
    return {
      name: countryName,
      value: country.alpha2,
    }
  }) || []
})

const shippingPrice = ref(3)
const userId = computed(() => (user.value?.id ? String(user.value.id) : null))

const ZodCheckout = z.object({
  user: z.string({ required_error: $i18n.t('validation.required') }).optional(),
  country: z.string({ required_error: $i18n.t('validation.required') }).optional(),
  region: z.string({ required_error: $i18n.t('validation.required') }).optional(),
  floor: z.union([z.nativeEnum(FloorChoicesEnum), z.string({ required_error: $i18n.t('validation.required') })]).optional(),
  locationType: z
    .union([z.nativeEnum(LocationChoicesEnum), z.string({ required_error: $i18n.t('validation.required') })])
    .optional(),
  street: z
    .string()
    .min(3, t('validation.street.min', { min: 3 })),
  streetNumber: z
    .string()
    .min(1, t('validation.street_number.min', { min: 1 })),
  status: ZodOrderStatusEnum.optional(),
  firstName: z
    .string()
    .min(3, t('validation.first_name.min', { min: 3 })),
  lastName: z
    .string()
    .min(3, t('validation.last_name.min', { min: 3 })),
  email: z.string({ required_error: $i18n.t('validation.required') }).email($i18n.t('validation.email.valid')),
  zipcode: z
    .string()
    .min(3, t('validation.zipcode.min', { min: 3 })),
  place: z
    .string()
    .min(3, t('validation.place.min', { min: 3 })),
  city: z.string({ required_error: $i18n.t('validation.required') }).min(3, t('validation.city.min', { min: 3 })),
  phone: z
    .string()
    .min(3, t('validation.phone.min', { min: 3 })),
  mobilePhone: z.string({ required_error: $i18n.t('validation.required') }).optional(),
  customerNotes: z.string({ required_error: $i18n.t('validation.required') }).optional(),
  shippingPrice: z.number(),
  documentType: ZodDocumentTypeEnum,
  items: z.array(ZodOrderCreateItem),
  payWay: z.number({ required_error: $i18n.t('validation.required') }),
})

const validationSchema = toTypedSchema(ZodCheckout)
const { defineField, setFieldValue, handleSubmit, errors, isSubmitting }
  = useForm({
    validationSchema,
    initialValues: {
      user: userId.value || undefined,
      country: defaultSelectOptionChoose,
      region: defaultSelectOptionChoose,
      floor: defaultSelectOptionChoose,
      locationType: defaultSelectOptionChoose,
      items:
      getCartItems.value?.map(item => ({
        ...item,
        product: item.product.id,
      })) || [],
      shippingPrice: shippingPrice.value,
      documentType: ZodDocumentTypeEnum.enum.RECEIPT,
      payWay: payWay.value?.id || undefined,
    },
  })

const [email, emailProps] = defineField('email', {
  validateOnModelUpdate: true,
})
const [firstName, firstNameProps] = defineField('firstName', {
  validateOnModelUpdate: true,
})
const [lastName, lastNameProps] = defineField('lastName', {
  validateOnModelUpdate: true,
})
const [street, streetProps] = defineField('street', {
  validateOnModelUpdate: true,
})
const [streetNumber, streetNumberProps] = defineField('streetNumber', {
  validateOnModelUpdate: true,
})
const [zipcode, zipcodeProps] = defineField('zipcode', {
  validateOnModelUpdate: true,
})
const [place, placeProps] = defineField('place', {
  validateOnModelUpdate: true,
})
const [city, cityProps] = defineField('city', {
  validateOnModelUpdate: true,
})
const [phone, phoneProps] = defineField('phone', {
  validateOnModelUpdate: true,
})
const [mobilePhone, mobilePhoneProps] = defineField('mobilePhone', {
  validateOnModelUpdate: true,
})
const [customerNotes, customerNotesProps] = defineField('customerNotes', {
  validateOnModelUpdate: true,
})
const [floor, floorProps] = defineField('floor', {
  validateOnModelUpdate: true,
})
const [locationType, locationTypeProps] = defineField('locationType', {
  validateOnModelUpdate: true,
})
const [country, countryProps] = defineField('country', {
  validateOnModelUpdate: true,
})
const [region, regionProps] = defineField('region', {
  validateOnModelUpdate: true,
})

const fetchRegions = async () => {
  if (country.value === defaultSelectOptionChoose) {
    return
  }

  try {
    regions.value = await $fetch<Pagination<Region>>('/api/regions', {
      method: 'GET',
      query: {
        country: country.value,
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

const regionOptions = computed(() => {
  return regions.value?.results?.map((region) => {
    const regionName = extractTranslated(region, 'name', locale.value)
    return {
      name: regionName,
      value: region.alpha,
    }
  }) || []
})

const onCountryChange = async (event: Event) => {
  if (!(event.target instanceof HTMLSelectElement)) return
  country.value = event.target.value
  region.value = defaultSelectOptionChoose
  await fetchRegions()
}

const onSubmit = handleSubmit(async (values) => {
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
})

const submitButtonDisabled = computed(() => {
  return isSubmitting.value || Object.keys(errors.value).length > 0
})

watch(
  () => payWay.value,
  () => {
    setFieldValue('payWay', payWay.value?.id || undefined)
  },
)

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper
    class="
      flex flex-col gap-4

      md:gap-8
    "
  >
    <form
      id="checkoutForm"
      class="
          _form grid gap-2

          lg:grid-cols-[2fr,0.75fr]

          md:gap-4
        "
      name="checkoutForm"
      @submit="onSubmit"
    >
      <div
        class="
            bg-primary-100 text-primary-50 container grid gap-4 rounded-lg !p-6

            dark:bg-primary-900 dark:text-primary-950

            md:p-10
          "
      >
        <div
          class="
              flex flex-col gap-4

              md:grid md:grid-cols-2
            "
        >
          <div class="grid">
            <label
              class="
                  text-primary-950 sr-only mb-2

                  dark:text-primary-50
                "
              for="firstName"
            >{{ t('form.first_name') }}</label>
            <div class="grid">
              <FormTextInput
                id="firstName"
                v-model="firstName"
                :bind="firstNameProps"
                :placeholder="t('form.first_name')"
                autocomplete="given-name"
                name="firstName"
                type="text"
              />
            </div>
            <span
              v-if="errors.firstName"
              class="text-xs text-red-600"
            >{{
              errors.firstName
            }}</span>
          </div>

          <div class="grid">
            <label
              class="
                  text-primary-950 sr-only mb-2

                  dark:text-primary-50
                "
              for="lastName"
            >{{ t('form.last_name') }}</label>
            <div class="grid">
              <FormTextInput
                id="lastName"
                v-model="lastName"
                :bind="lastNameProps"
                :placeholder="t('form.last_name')"
                autocomplete="family-name"
                name="lastName"
                type="text"
              />
            </div>
            <span
              v-if="errors.lastName"
              class="text-xs text-red-600"
            >{{
              errors.lastName
            }}</span>
          </div>

          <div class="grid">
            <label
              class="
                  text-primary-950 sr-only mb-2

                  dark:text-primary-50
                "
              for="email"
            >{{ t('form.email') }}</label>
            <div class="grid">
              <FormTextInput
                id="email"
                v-model="email"
                :bind="emailProps"
                :placeholder="t('form.email')"
                autocomplete="email"
                name="email"
                type="email"
              />
            </div>
            <span
              v-if="errors.email"
              class="text-xs text-red-600"
            >{{
              errors.email
            }}</span>
          </div>

          <div class="grid">
            <label
              class="
                  text-primary-950 sr-only mb-2

                  dark:text-primary-50
                "
              for="phone"
            >{{ t('form.phone') }}</label>
            <div class="grid">
              <FormTextInput
                id="phone"
                v-model="phone"
                :bind="phoneProps"
                :placeholder="t('form.phone')"
                autocomplete="tel"
                name="phone"
                type="text"
              />
            </div>
            <span
              v-if="errors.phone"
              class="text-xs text-red-600"
            >{{
              errors.phone
            }}</span>
          </div>

          <div class="grid">
            <label
              class="
                  text-primary-950 sr-only mb-2

                  dark:text-primary-50
                "
              for="mobilePhone"
            >{{ t('form.mobile_phone') }}</label>
            <div class="grid">
              <FormTextInput
                id="mobilePhone"
                v-model="mobilePhone"
                :bind="mobilePhoneProps"
                :placeholder="t('form.mobile_phone')"
                autocomplete="tel"
                name="mobilePhone"
                type="text"
              />
            </div>
            <span
              v-if="errors.mobilePhone"
              class="text-xs text-red-600"
            >{{
              errors.mobilePhone
            }}</span>
          </div>

          <div class="grid">
            <label
              class="
                  text-primary-950 sr-only mb-2

                  dark:text-primary-50
                "
              for="city"
            >{{ t('form.city') }}</label>
            <div class="grid">
              <FormTextInput
                id="city"
                v-model="city"
                :bind="cityProps"
                :placeholder="t('form.city')"
                autocomplete="address-level2"
                name="city"
                type="text"
              />
            </div>
            <span
              v-if="errors.city"
              class="text-xs text-red-600"
            >{{
              errors.city
            }}</span>
          </div>

          <div class="grid">
            <label
              class="
                  text-primary-950 sr-only mb-2

                  dark:text-primary-50
                "
              for="place"
            >{{ t('form.place') }}</label>
            <div class="grid">
              <FormTextInput
                id="place"
                v-model="place"
                :bind="placeProps"
                :placeholder="t('form.place')"
                autocomplete="address-level2"
                name="place"
                type="text"
              />
            </div>
            <span
              v-if="errors.place"
              class="text-xs text-red-600"
            >{{
              errors.place
            }}</span>
          </div>

          <div class="grid content-evenly items-start gap-1">
            <label
              class="
                  text-primary-950 sr-only mb-2

                  dark:text-primary-50
                "
              for="zipcode"
            >{{ t('form.zipcode') }}</label>
            <div class="grid">
              <FormTextInput
                id="zipcode"
                v-model="zipcode"
                :bind="zipcodeProps"
                :placeholder="t('form.zipcode')"
                autocomplete="postal-code"
                name="zipcode"
                type="text"
              />
            </div>
            <span
              v-if="errors.zipcode"
              class="text-xs text-red-600"
            >{{
              errors.zipcode
            }}</span>
          </div>

          <div class="grid">
            <label
              class="
                  text-primary-950 sr-only mb-2

                  dark:text-primary-50
                "
              for="street"
            >{{ t('form.street') }}</label>
            <div class="grid">
              <FormTextInput
                id="street"
                v-model="street"
                :bind="streetProps"
                :placeholder="t('form.street')"
                autocomplete="address-line1"
                name="street"
                type="text"
              />
            </div>
            <span
              v-if="errors.street"
              class="text-xs text-red-600"
            >{{
              errors.street
            }}</span>
          </div>

          <div class="grid">
            <label
              class="
                  text-primary-950 sr-only mb-2

                  dark:text-primary-50
                "
              for="streetNumber"
            >{{ t('form.street_number') }}</label>
            <div class="grid">
              <FormTextInput
                id="streetNumber"
                v-model="streetNumber"
                :bind="streetNumberProps"
                :placeholder="t('form.street_number')"
                autocomplete="address-line2"
                name="streetNumber"
                type="text"
              />
            </div>
            <span
              v-if="errors.streetNumber"
              class="text-xs text-red-600"
            >{{
              errors.streetNumber
            }}</span>
          </div>

          <div class="col-span-2 grid">
            <label
              class="
                  text-primary-950 sr-only mb-2

                  dark:text-primary-50
                "
              for="customerNotes"
            >{{ t('form.customer_notes') }}</label>
            <div class="grid">
              <Field
                id="customerNotes"
                v-model="customerNotes"
                :as="UTextarea"
                :placeholder="t('form.customer_notes')"
                :rows="4"
                color="neutral"
                name="customerNotes"
                type="text"
                v-bind="customerNotesProps"
              />
            </div>
          </div>
        </div>
        <div
          class="
              grid gap-4

              md:grid-cols-2
            "
        >
          <div class="grid content-evenly items-start gap-2">
            <div class="grid">
              <label
                class="
                    text-primary-950 mb-2

                    dark:text-primary-50
                  "
                for="floor"
              >{{ t('form.floor') }}</label>
              <Field
                id="floor"
                v-model="floor"
                :as="USelect"
                :bind="floorProps"
                :options="floorChoicesList"
                :placeholder="floor === defaultSelectOptionChoose ? `${defaultSelectOptionChoose}...` : ''"
                color="neutral"
                name="floor"
                option-attribute="name"
              />
              <span
                v-if="errors.floor"
                class="text-xs text-red-600"
              >{{
                errors.floor
              }}</span>
            </div>
            <div class="grid">
              <label
                class="
                    text-primary-950 mb-2

                    dark:text-primary-50
                  "
                for="locationType"
              >{{ t('form.location_type') }}</label>
              <Field
                id="locationType"
                v-model="locationType"
                :as="USelect"
                :options="locationChoicesList"
                :placeholder="locationType === defaultSelectOptionChoose ? `${defaultSelectOptionChoose}...` : ''"
                color="neutral"
                name="locationType"
                option-attribute="name"
                v-bind="locationTypeProps"
              />
              <span
                v-if="errors.locationType"
                class="text-xs text-red-600"
              >{{
                errors.locationType
              }}</span>
            </div>
          </div>

          <div class="grid content-evenly items-start gap-2">
            <div class="grid">
              <label
                class="
                    text-primary-950 mb-2

                    dark:text-primary-50
                  "
                for="country"
              >{{ t('form.country') }}</label>
              <div class="grid">
                <Field
                  id="country"
                  v-model="country"
                  :as="USelect"
                  :options="countryOptions"
                  :placeholder="country === defaultSelectOptionChoose ? `${defaultSelectOptionChoose}...` : ''"
                  color="neutral"
                  name="country"
                  option-attribute="name"
                  v-bind="countryProps"
                  @change.capture="onCountryChange"
                />
              </div>
              <span
                v-if="errors.country"
                class="text-xs text-red-600"
              >{{
                errors.country
              }}</span>
            </div>
            <div class="grid">
              <label
                class="
                    text-primary-950 mb-2

                    dark:text-primary-50
                  "
                for="region"
              >{{ t('form.region') }}</label>
              <div class="grid">
                <Field
                  id="region"
                  v-model="region"
                  :as="USelect"
                  :options="regionOptions"
                  :placeholder="region === defaultSelectOptionChoose ? `${defaultSelectOptionChoose}...` : ''"
                  color="neutral"
                  name="region"
                  option-attribute="name"
                  v-bind="regionProps"
                />
              </div>
              <span
                v-if="errors.region"
                class="text-xs text-red-600"
              >{{
                errors.region
              }}</span>
            </div>
          </div>
        </div>
      </div>
      <CheckoutSidebar
        :shipping-price="shippingPrice"
        class="
            bg-primary-100 text-primary-50 container rounded-lg !p-6

            dark:bg-primary-900 dark:text-primary-950

            md:p-8
          "
      >
        <template #pay-ways>
          <CheckoutPayWays>
            <template #error>
              <span
                v-if="errors.payWay"
                class="text-center text-xs text-red-600"
              >{{ errors.payWay }}</span>
            </template>
          </CheckoutPayWays>
        </template>
        <template #items>
          <CheckoutItems />
        </template>
        <template #button>
          <div class="grid items-center">
            <button
              :aria-busy="isSubmitting"
              :disabled="submitButtonDisabled"
              class="
                  text-primary-50 rounded bg-secondary px-4 py-2 font-bold

                  disabled:cursor-not-allowed disabled:opacity-50
                "
              type="submit"
            >
              {{ t('form.submit.title') }}
            </button>
          </div>
        </template>
      </CheckoutSidebar>
    </form>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Ολοκλήρωση αγοράς
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
    street: Δρόμος
    street_number: Αριθμός δρόμου
    customer_notes: Σημειώσεις Πελατών
    submit:
      title: Αποθήκευση
      success: Η παραγγελία δημιουργήθηκε με επιτυχία
      error: Σφάλμα δημιουργίας παραγγελίας
  validation:
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
