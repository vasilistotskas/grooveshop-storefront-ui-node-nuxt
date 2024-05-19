<script lang="ts" setup>
import { z } from 'zod'

import { defaultSelectOptionChoose, floorChoicesList, locationChoicesList } from '~/constants'
import { FloorChoicesEnum, LocationChoicesEnum } from '~/types'
import { ZodDocumentTypeEnum, ZodOrderStatusEnum } from '~/types/order/order'
import { ZodOrderCreateItem } from '~/types/order/order-item'
import type { PayWay } from '~/types/pay-way'
import type { Pagination } from '~/types/pagination'
import type { Region } from '~/types/region'

const { user, fetch } = useUserSession()

const cartStore = useCartStore()
const { getCartItems } = storeToRefs(cartStore)
const { cleanCartState } = cartStore

const { t, locale } = useI18n()
const toast = useToast()

const UTextarea = resolveComponent('UTextarea')
const USelect = resolveComponent('USelect')

const payWay = useState<PayWay | null>('selectedPayWay')
const regions = ref<Pagination<Region> | null>(null)

const { data: countries } = await useAsyncData('countries', () =>
  $fetch('/api/countries', {
    method: 'GET',
    query: {
      language: locale.value,
    },
  }),
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
  user: z.string({ required_error: t('common.validation.required') }).optional(),
  country: z.string({ required_error: t('common.validation.required') }).optional(),
  region: z.string({ required_error: t('common.validation.required') }).optional(),
  floor: z.union([z.nativeEnum(FloorChoicesEnum), z.string({ required_error: t('common.validation.required') })]).optional(),
  locationType: z
    .union([z.nativeEnum(LocationChoicesEnum), z.string({ required_error: t('common.validation.required') })])
    .optional(),
  street: z
    .string()
    .min(3, t('pages.checkout.validation.street.min', { min: 3 })),
  streetNumber: z
    .string()
    .min(1, t('pages.checkout.validation.street_number.min', { min: 1 })),
  status: ZodOrderStatusEnum.optional(),
  firstName: z
    .string()
    .min(3, t('pages.checkout.validation.first_name.min', { min: 3 })),
  lastName: z
    .string()
    .min(3, t('pages.checkout.validation.last_name.min', { min: 3 })),
  email: z.string({ required_error: t('common.validation.required') }).email(t('common.validation.email.valid')),
  zipcode: z
    .string()
    .min(3, t('pages.checkout.validation.zipcode.min', { min: 3 })),
  place: z
    .string()
    .min(3, t('pages.checkout.validation.place.min', { min: 3 })),
  city: z.string({ required_error: t('common.validation.required') }).min(3, t('pages.checkout.validation.city.min', { min: 3 })),
  phone: z
    .string()
    .min(3, t('pages.checkout.validation.phone.min', { min: 3 })),
  mobilePhone: z.string({ required_error: t('common.validation.required') }).optional(),
  customerNotes: z.string({ required_error: t('common.validation.required') }).optional(),
  shippingPrice: z.number(),
  documentType: ZodDocumentTypeEnum,
  orderItemOrder: z.array(ZodOrderCreateItem),
  payWay: z.number({ required_error: t('common.validation.required') }),
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
      orderItemOrder:
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
    regions.value = await $fetch('/api/regions', {
      method: 'GET',
      query: {
        country: country.value,
        language: locale.value,
      },
    })
  }
  catch (error) {
    toast.add({
      title: t('common.error'),
      description: t('common.error_occurred'),
      color: 'red',
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

  await $fetch('/api/orders', {
    method: 'POST',
    body: updatedValues,
    async onResponse({ response }) {
      if (!response.ok) {
        return
      }
      toast.add({
        title: t('pages.checkout.form.submit.success'),
        color: 'green',
      })
      cleanCartState()
      await fetch()
      await navigateTo(`/checkout/success/${response._data.uuid}`)
    },
    onResponseError({ error }) {
      toast.add({
        title: error?.message,
        color: 'red',
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
      container-sm flex flex-col gap-4

      md:gap-8
    "
  >
    <PageBody>
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
            bg-primary-100 container grid gap-4 rounded-lg !p-6 text-primary-50

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
              >{{ $t('pages.checkout.form.first_name') }}</label>
              <div class="grid">
                <FormTextInput
                  id="firstName"
                  v-model="firstName"
                  :bind="firstNameProps"
                  :placeholder="$t('pages.checkout.form.first_name')"
                  autocomplete="given-name"
                  name="firstName"
                  type="text"
                />
              </div>
              <span v-if="errors.firstName" class="text-xs text-red-600">{{
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
              >{{ $t('pages.checkout.form.last_name') }}</label>
              <div class="grid">
                <FormTextInput
                  id="lastName"
                  v-model="lastName"
                  :bind="lastNameProps"
                  :placeholder="$t('pages.checkout.form.last_name')"
                  autocomplete="family-name"
                  name="lastName"
                  type="text"
                />
              </div>
              <span v-if="errors.lastName" class="text-xs text-red-600">{{
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
              >{{ $t('pages.checkout.form.email') }}</label>
              <div class="grid">
                <FormTextInput
                  id="email"
                  v-model="email"
                  :bind="emailProps"
                  :placeholder="$t('pages.checkout.form.email')"
                  autocomplete="email"
                  name="email"
                  type="email"
                />
              </div>
              <span v-if="errors.email" class="text-xs text-red-600">{{
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
              >{{ $t('pages.checkout.form.phone') }}</label>
              <div class="grid">
                <FormTextInput
                  id="phone"
                  v-model="phone"
                  :bind="phoneProps"
                  :placeholder="$t('pages.checkout.form.phone')"
                  autocomplete="tel"
                  name="phone"
                  type="text"
                />
              </div>
              <span v-if="errors.phone" class="text-xs text-red-600">{{
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
              >{{ $t('pages.checkout.form.mobile_phone') }}</label>
              <div class="grid">
                <FormTextInput
                  id="mobilePhone"
                  v-model="mobilePhone"
                  :bind="mobilePhoneProps"
                  :placeholder="$t('pages.checkout.form.mobile_phone')"
                  autocomplete="tel"
                  name="mobilePhone"
                  type="text"
                />
              </div>
              <span v-if="errors.mobilePhone" class="text-xs text-red-600">{{
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
              >{{ $t('pages.checkout.form.city') }}</label>
              <div class="grid">
                <FormTextInput
                  id="city"
                  v-model="city"
                  :bind="cityProps"
                  :placeholder="$t('pages.checkout.form.city')"
                  autocomplete="address-level2"
                  name="city"
                  type="text"
                />
              </div>
              <span v-if="errors.city" class="text-xs text-red-600">{{
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
              >{{ $t('pages.checkout.form.place') }}</label>
              <div class="grid">
                <FormTextInput
                  id="place"
                  v-model="place"
                  :bind="placeProps"
                  :placeholder="$t('pages.checkout.form.place')"
                  autocomplete="address-level2"
                  name="place"
                  type="text"
                />
              </div>
              <span v-if="errors.place" class="text-xs text-red-600">{{
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
              >{{ $t('pages.checkout.form.zipcode') }}</label>
              <div class="grid">
                <FormTextInput
                  id="zipcode"
                  v-model="zipcode"
                  :bind="zipcodeProps"
                  :placeholder="$t('pages.checkout.form.zipcode')"
                  autocomplete="postal-code"
                  name="zipcode"
                  type="text"
                />
              </div>
              <span v-if="errors.zipcode" class="text-xs text-red-600">{{
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
              >{{ $t('pages.checkout.form.street') }}</label>
              <div class="grid">
                <FormTextInput
                  id="street"
                  v-model="street"
                  :bind="streetProps"
                  :placeholder="$t('pages.checkout.form.street')"
                  autocomplete="address-line1"
                  name="street"
                  type="text"
                />
              </div>
              <span v-if="errors.street" class="text-xs text-red-600">{{
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
              >{{ $t('pages.checkout.form.street_number') }}</label>
              <div class="grid">
                <FormTextInput
                  id="streetNumber"
                  v-model="streetNumber"
                  :bind="streetNumberProps"
                  :placeholder="$t('pages.checkout.form.street_number')"
                  autocomplete="address-line2"
                  name="streetNumber"
                  type="text"
                />
              </div>
              <span v-if="errors.streetNumber" class="text-xs text-red-600">{{
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
              >{{ $t('pages.checkout.form.customer_notes') }}</label>
              <div class="grid">
                <VeeField
                  id="customerNotes"
                  v-model="customerNotes"
                  :as="UTextarea"
                  v-bind="customerNotesProps"
                  :placeholder="$t('pages.checkout.form.customer_notes')"
                  name="customerNotes"
                  :rows="4"
                  color="primary"
                  type="text"
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
                >{{ $t('pages.checkout.form.floor') }}</label>
                <VeeField
                  id="floor"
                  v-model="floor"
                  :bind="floorProps"
                  name="floor"
                  color="white"
                  :as="USelect"
                  :options="floorChoicesList"
                  option-attribute="name"
                  :placeholder="floor === defaultSelectOptionChoose ? `${defaultSelectOptionChoose}...` : ''"
                />
                <span v-if="errors.floor" class="text-xs text-red-600">{{
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
                >{{ $t('pages.checkout.form.location_type') }}</label>
                <VeeField
                  id="locationType"
                  v-model="locationType"
                  v-bind="locationTypeProps"
                  name="locationType"
                  color="white"
                  :as="USelect"
                  :options="locationChoicesList"
                  option-attribute="name"
                  :placeholder="locationType === defaultSelectOptionChoose ? `${defaultSelectOptionChoose}...` : ''"
                />
                <span v-if="errors.locationType" class="text-xs text-red-600">{{
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
                >{{ $t('pages.checkout.form.country') }}</label>
                <div class="grid">
                  <VeeField
                    id="country"
                    v-model="country"
                    v-bind="countryProps"
                    name="country"
                    color="white"
                    :as="USelect"
                    :options="countryOptions"
                    option-attribute="name"
                    :placeholder="country === defaultSelectOptionChoose ? `${defaultSelectOptionChoose}...` : ''"
                    @change.capture="onCountryChange"
                  />
                </div>
                <span v-if="errors.country" class="text-xs text-red-600">{{
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
                >{{ $t('pages.checkout.form.region') }}</label>
                <div class="grid">
                  <VeeField
                    id="region"
                    v-model="region"
                    v-bind="regionProps"
                    name="region"
                    color="white"
                    :as="USelect"
                    :options="regionOptions"
                    option-attribute="name"
                    :placeholder="region === defaultSelectOptionChoose ? `${defaultSelectOptionChoose}...` : ''"
                  />
                </div>
                <span v-if="errors.region" class="text-xs text-red-600">{{
                  errors.region
                }}</span>
              </div>
            </div>
          </div>
        </div>
        <CheckoutSidebar
          :shipping-price="shippingPrice"
          class="
            bg-primary-100 container rounded-lg !p-6 text-primary-50

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
                  rounded bg-secondary px-4 py-2 font-bold text-primary-50

                  dark:bg-secondary-dark

                  disabled:cursor-not-allowed disabled:opacity-50
                "
                type="submit"
              >
                {{ $t('pages.checkout.form.submit.title') }}
              </button>
            </div>
          </template>
        </CheckoutSidebar>
      </form>
    </PageBody>
  </PageWrapper>
</template>
