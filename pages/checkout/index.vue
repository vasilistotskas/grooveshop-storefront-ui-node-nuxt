<script lang="ts" setup>
import { z } from 'zod'
import {
	defaultSelectOptionChoose,
	floorChoicesList,
	locationChoicesList
} from '~/constants/general'
import { documentTypeEnum, StatusEnum } from '~/types/order/order'
import { ZodOrderCreateItem } from '~/types/order/order-item'
import { FloorChoicesEnum, LocationChoicesEnum } from '~/types/global/general'

const userStore = useUserStore()
const { account } = storeToRefs(userStore)

const cartStore = useCartStore()
const { getCartItems } = storeToRefs(cartStore)
const { cleanCartState } = cartStore

const countryStore = useCountryStore()
const { countries } = storeToRefs(countryStore)
const { fetchCountries } = countryStore

const regionStore = useRegionStore()
const { regions } = storeToRefs(regionStore)
const { fetchRegions } = regionStore

const payWayStore = usePayWayStore()
const { getSelectedPayWayId } = storeToRefs(payWayStore)

const orderStore = useOrderStore()
const { createOrder } = orderStore

const { t, locale } = useI18n()
const router = useRouter()
const toast = useToast()
const { extractTranslated } = useTranslationExtractor()

await fetchCountries()

const shippingPrice = ref(3)
const userId = computed(() => (account.value?.id ? String(account.value.id) : null))

const ZodCheckout = z.object({
	user: z.string().nullish(),
	country: z.string().refine((value) => value !== defaultSelectOptionChoose, {
		message: t('common.validation.country.required')
	}),
	region: z.string().refine((value) => value !== defaultSelectOptionChoose, {
		message: t('common.validation.region.required')
	}),
	floor: z.union([z.nativeEnum(FloorChoicesEnum), z.string()]).nullish(),
	locationType: z.union([z.nativeEnum(LocationChoicesEnum), z.string()]).nullish(),
	street: z.string().min(3, t('pages.checkout.validation.street.min', { min: 3 })),
	streetNumber: z
		.string()
		.min(1, t('pages.checkout.validation.street_number.min', { min: 1 })),
	status: StatusEnum.nullish(),
	firstName: z.string().min(3, t('pages.checkout.validation.first_name.min', { min: 3 })),
	lastName: z.string().min(3, t('pages.checkout.validation.last_name.min', { min: 3 })),
	email: z.string().email(t('pages.checkout.validation.email.email')),
	zipcode: z.string().min(3, t('pages.checkout.validation.zipcode.min', { min: 3 })),
	place: z.string().min(3, t('pages.checkout.validation.place.min', { min: 3 })),
	city: z.string().min(3, t('pages.checkout.validation.city.min', { min: 3 })),
	phone: z.string().min(3, t('pages.checkout.validation.phone.min', { min: 3 })),
	mobilePhone: z.string().nullish(),
	customerNotes: z.string().nullish(),
	shippingPrice: z.number(),
	documentType: documentTypeEnum,
	orderItemOrder: z.array(ZodOrderCreateItem),
	payWay: z.number()
})

const validationSchema = toTypedSchema(ZodCheckout)
const { defineField, setFieldValue, handleSubmit, errors, isSubmitting } = useForm({
	validationSchema,
	initialValues: {
		user: userId.value || null,
		country: defaultSelectOptionChoose,
		region: defaultSelectOptionChoose,
		floor: defaultSelectOptionChoose,
		locationType: defaultSelectOptionChoose,
		orderItemOrder:
			getCartItems.value?.map((item) => ({
				...item,
				product: item.product.id
			})) || [],
		shippingPrice: shippingPrice.value,
		documentType: documentTypeEnum.enum.RECEIPT
	}
})

const [email, emailProps] = defineField('email', {
	validateOnModelUpdate: true
})
const [firstName, firstNameProps] = defineField('firstName', {
	validateOnModelUpdate: true
})
const [lastName, lastNameProps] = defineField('lastName', {
	validateOnModelUpdate: true
})
const [street, streetProps] = defineField('street', {
	validateOnModelUpdate: true
})
const [streetNumber, streetNumberProps] = defineField('streetNumber', {
	validateOnModelUpdate: true
})
const [zipcode, zipcodeProps] = defineField('zipcode', {
	validateOnModelUpdate: true
})
const [place, placeProps] = defineField('place', {
	validateOnModelUpdate: true
})
const [city, cityProps] = defineField('city', {
	validateOnModelUpdate: true
})
const [phone, phoneProps] = defineField('phone', {
	validateOnModelUpdate: true
})
const [mobilePhone, mobilePhoneProps] = defineField('mobilePhone', {
	validateOnModelUpdate: true
})
const [customerNotes, customerNotesProps] = defineField('customerNotes', {
	validateOnModelUpdate: true
})
const [floor, floorProps] = defineField('floor', {
	validateOnModelUpdate: true
})
const [locationType, locationTypeProps] = defineField('locationType', {
	validateOnModelUpdate: true
})
const [country, countryProps] = defineField('country', {
	validateOnModelUpdate: true
})
const [region, regionProps] = defineField('region', {
	validateOnModelUpdate: true
})

const onCountryChange = async (event: Event) => {
	if (!(event.target instanceof HTMLSelectElement)) return
	await fetchRegions({
		country: event.target.value
	})
	region.value = defaultSelectOptionChoose
}

const onSubmit = handleSubmit(async (values) => {
	const updatedValues = Object.keys(values).reduce(
		(acc, key) => {
			const validKey = key as keyof typeof values
			if (String(values[validKey]) === defaultSelectOptionChoose) {
				acc[validKey] = null as never
			} else {
				acc[validKey] = values[validKey] as never
			}
			return acc
		},
		{} as typeof values
	)

	const { data, error } = await createOrder(updatedValues)
	if (data.value?.id) {
		toast.add({
			title: t('pages.checkout.form.submit.success'),
			color: 'green'
		})
		cleanCartState()
		await router.push(`/checkout/success/${data.value.uuid}`)
	} else if (error.value) {
		toast.add({
			title: t('pages.checkout.form.submit.error'),
			color: 'red'
		})
		clearNuxtData('createOrder')
	}
})

const submitButtonDisabled = computed(() => {
	return isSubmitting.value || Object.keys(errors.value).length > 0
})

watch(
	() => getSelectedPayWayId.value,
	() => {
		setFieldValue('payWay', getSelectedPayWayId.value || undefined)
	}
)

definePageMeta({
	layout: 'default'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4 md:gap-8">
		<PageBody>
			<form
				id="checkoutForm"
				class="_form grid gap-2 md:grid-cols-2fr-1fr md:gap-4"
				name="checkoutForm"
				@submit="onSubmit"
			>
				<div
					class="container grid gap-4 rounded-lg bg-white p-6 text-white dark:bg-zinc-800 dark:text-black md:p-10"
				>
					<div class="flex flex-col gap-4 md:grid md:grid-cols-2">
						<div class="grid">
							<label
								class="text-primary-700 dark:text-primary-100 sr-only mb-2"
								for="firstName"
								>{{ $t('pages.checkout.form.first_name') }}</label
							>
							<div class="grid">
								<FormTextInput
									id="firstName"
									v-model="firstName"
									:bind="firstNameProps"
									:placeholder="$t('pages.checkout.form.first_name')"
									autocomplete="firstName"
									class="text-primary-700 dark:text-primary-100 mb-2"
									name="firstName"
									type="text"
								/>
							</div>
							<span v-if="errors.firstName" class="text-sm text-red-600">{{
								errors.firstName
							}}</span>
						</div>

						<div class="grid">
							<label
								class="text-primary-700 dark:text-primary-100 sr-only mb-2"
								for="lastName"
								>{{ $t('pages.checkout.form.last_name') }}</label
							>
							<div class="grid">
								<FormTextInput
									id="lastName"
									v-model="lastName"
									:bind="lastNameProps"
									:placeholder="$t('pages.checkout.form.last_name')"
									autocomplete="lastName"
									class="text-primary-700 dark:text-primary-100 mb-2"
									name="lastName"
									type="text"
								/>
							</div>
							<span v-if="errors.lastName" class="text-sm text-red-600">{{
								errors.lastName
							}}</span>
						</div>

						<div class="grid">
							<label
								class="text-primary-700 dark:text-primary-100 sr-only mb-2"
								for="email"
								>{{ $t('pages.checkout.form.email') }}</label
							>
							<div class="grid">
								<FormTextInput
									id="email"
									v-model="email"
									:bind="emailProps"
									:placeholder="$t('pages.checkout.form.email')"
									autocomplete="email"
									class="text-primary-700 dark:text-primary-100 mb-2"
									name="email"
									type="email"
								/>
							</div>
							<span v-if="errors.email" class="text-sm text-red-600">{{
								errors.email
							}}</span>
						</div>

						<div class="grid">
							<label
								class="text-primary-700 dark:text-primary-100 sr-only mb-2"
								for="phone"
								>{{ $t('pages.checkout.form.phone') }}</label
							>
							<div class="grid">
								<FormTextInput
									id="phone"
									v-model="phone"
									:bind="phoneProps"
									:placeholder="$t('pages.checkout.form.phone')"
									autocomplete="phone"
									class="text-primary-700 dark:text-primary-100 mb-2"
									name="phone"
									type="text"
								/>
							</div>
							<span v-if="errors.phone" class="text-sm text-red-600">{{
								errors.phone
							}}</span>
						</div>

						<div class="grid">
							<label
								class="text-primary-700 dark:text-primary-100 sr-only mb-2"
								for="mobilePhone"
								>{{ $t('pages.checkout.form.mobile_phone') }}</label
							>
							<div class="grid">
								<FormTextInput
									id="mobilePhone"
									v-model="mobilePhone"
									:bind="mobilePhoneProps"
									:placeholder="$t('pages.checkout.form.mobile_phone')"
									autocomplete="mobilePhone"
									class="text-primary-700 dark:text-primary-100 mb-2"
									name="mobilePhone"
									type="text"
								/>
							</div>
							<span v-if="errors.mobilePhone" class="text-sm text-red-600">{{
								errors.mobilePhone
							}}</span>
						</div>

						<div class="grid">
							<label
								class="text-primary-700 dark:text-primary-100 sr-only mb-2"
								for="city"
								>{{ $t('pages.checkout.form.city') }}</label
							>
							<div class="grid">
								<FormTextInput
									id="city"
									v-model="city"
									:bind="cityProps"
									:placeholder="$t('pages.checkout.form.city')"
									autocomplete="city"
									class="text-primary-700 dark:text-primary-100 mb-2"
									name="city"
									type="text"
								/>
							</div>
							<span v-if="errors.city" class="text-sm text-red-600">{{
								errors.city
							}}</span>
						</div>

						<div class="grid">
							<label
								class="text-primary-700 dark:text-primary-100 sr-only mb-2"
								for="place"
								>{{ $t('pages.checkout.form.place') }}</label
							>
							<div class="grid">
								<FormTextInput
									id="place"
									v-model="place"
									:bind="placeProps"
									:placeholder="$t('pages.checkout.form.place')"
									autocomplete="place"
									class="text-primary-700 dark:text-primary-100 mb-2"
									name="place"
									type="text"
								/>
							</div>
							<span v-if="errors.place" class="text-sm text-red-600">{{
								errors.place
							}}</span>
						</div>

						<div class="grid content-evenly items-start">
							<label
								class="text-primary-700 dark:text-primary-100 sr-only mb-2"
								for="zipcode"
								>{{ $t('pages.checkout.form.zipcode') }}</label
							>
							<div class="grid">
								<FormTextInput
									id="zipcode"
									v-model="zipcode"
									:bind="zipcodeProps"
									:placeholder="$t('pages.checkout.form.zipcode')"
									autocomplete="zipcode"
									class="text-primary-700 dark:text-primary-100 mb-2"
									name="zipcode"
									type="text"
								/>
							</div>
							<span v-if="errors.zipcode" class="text-sm text-red-600">{{
								errors.zipcode
							}}</span>
						</div>

						<div class="grid">
							<label
								class="text-primary-700 dark:text-primary-100 sr-only mb-2"
								for="street"
								>{{ $t('pages.checkout.form.street') }}</label
							>
							<div class="grid">
								<FormTextInput
									id="street"
									v-model="street"
									:bind="streetProps"
									:placeholder="$t('pages.checkout.form.street')"
									autocomplete="street"
									class="text-primary-700 dark:text-primary-100 mb-2"
									name="street"
									type="text"
								/>
							</div>
							<span v-if="errors.street" class="text-sm text-red-600">{{
								errors.street
							}}</span>
						</div>

						<div class="grid">
							<label
								class="text-primary-700 dark:text-primary-100 sr-only mb-2"
								for="streetNumber"
								>{{ $t('pages.checkout.form.street_number') }}</label
							>
							<div class="grid">
								<FormTextInput
									id="streetNumber"
									v-model="streetNumber"
									:bind="streetNumberProps"
									:placeholder="$t('pages.checkout.form.street_number')"
									autocomplete="streetNumber"
									class="text-primary-700 dark:text-primary-100 mb-2"
									name="streetNumber"
									type="text"
								/>
							</div>
							<span v-if="errors.streetNumber" class="text-sm text-red-600">{{
								errors.streetNumber
							}}</span>
						</div>

						<div class="col-span-2 grid">
							<label
								class="text-primary-700 dark:text-primary-100 sr-only mb-2"
								for="customerNotes"
								>{{ $t('pages.checkout.form.customer_notes') }}</label
							>
							<div class="grid">
								<VeeField
									id="customerNotes"
									v-model="customerNotes"
									as="textarea"
									v-bind="customerNotesProps"
									:placeholder="$t('pages.checkout.form.customer_notes')"
									class="text-input text-primary-700 dark:text-primary-100 w-full flex-1 rounded-l rounded-r border border-gray-900/10 bg-transparent px-4 py-2 text-base outline-none focus:border-gray-900 dark:border-gray-50/[0.2] dark:focus:border-white"
									name="customerNotes"
									rows="4"
									type="text"
								/>
							</div>
						</div>
					</div>
					<div class="grid gap-4 md:grid-cols-2">
						<div class="grid content-evenly items-start gap-4">
							<div class="grid">
								<label class="text-primary-700 dark:text-primary-100 mb-2" for="floor">{{
									$t('pages.checkout.form.floor')
								}}</label>
								<VeeField
									id="floor"
									v-model="floor"
									:bind="floorProps"
									name="floor"
									as="select"
									class="form-select text-primary-700 dark:text-primary-300 border border-gray-200 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8]"
								>
									<option
										:value="defaultSelectOptionChoose"
										disabled
										:selected="floorProps.value === defaultSelectOptionChoose"
									>
										{{ defaultSelectOptionChoose }}
									</option>
									<option
										v-for="(floorChoice, index) in floorChoicesList"
										:key="index"
										:value="index"
										:selected="Number(floorProps.value) === index"
										class="text-primary-700 dark:text-primary-300"
									>
										{{ floorChoice }}
									</option>
								</VeeField>
								<span v-if="errors.floor" class="text-sm text-red-600">{{
									errors.floor
								}}</span>
							</div>
							<div class="grid">
								<label
									class="text-primary-700 dark:text-primary-100 mb-2"
									for="locationType"
									>{{ $t('pages.checkout.form.location_type') }}</label
								>
								<VeeField
									id="locationType"
									v-model="locationType"
									v-bind="locationTypeProps"
									name="locationType"
									as="select"
									class="form-select text-primary-700 dark:text-primary-300 border border-gray-200 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8]"
								>
									<option
										:value="defaultSelectOptionChoose"
										disabled
										:selected="locationTypeProps.value === defaultSelectOptionChoose"
									>
										{{ defaultSelectOptionChoose }}
									</option>
									<option
										v-for="(location, index) in locationChoicesList"
										:key="index"
										:value="index"
										:selected="Number(locationTypeProps.value) === index"
										class="text-primary-700 dark:text-primary-300"
									>
										{{ location }}
									</option>
								</VeeField>
								<span v-if="errors.locationType" class="text-sm text-red-600">{{
									errors.locationType
								}}</span>
							</div>
						</div>

						<div class="grid content-evenly items-start gap-4">
							<div class="grid">
								<label
									class="text-primary-700 dark:text-primary-100 mb-2"
									for="country"
									>{{ $t('pages.checkout.form.country') }}</label
								>
								<div class="grid">
									<VeeField
										id="country"
										v-model="country"
										v-bind="countryProps"
										name="country"
										as="select"
										class="form-select text-primary-700 dark:text-primary-300 border border-gray-200 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8]"
										@change.capture="onCountryChange"
									>
										<option
											:value="defaultSelectOptionChoose"
											disabled
											:selected="countryProps.value === defaultSelectOptionChoose"
										>
											{{ defaultSelectOptionChoose }}
										</option>
										<option
											v-for="cntry in countries?.results"
											:key="cntry.alpha2"
											:value="cntry.alpha2"
											:selected="countryProps.value === cntry.alpha2"
											class="text-primary-700 dark:text-primary-300"
										>
											{{ extractTranslated(cntry, 'name', locale) }}
										</option>
									</VeeField>
								</div>
								<span v-if="errors.country" class="text-sm text-red-600">{{
									errors.country
								}}</span>
							</div>
							<div class="grid">
								<label class="text-primary-700 dark:text-primary-100 mb-2" for="region">{{
									$t('pages.checkout.form.region')
								}}</label>
								<div class="grid">
									<VeeField
										id="region"
										v-model="region"
										v-bind="regionProps"
										name="region"
										as="select"
										class="form-select text-primary-700 dark:text-primary-300 border border-gray-200 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8]"
										:disabled="countryProps.value === defaultSelectOptionChoose"
									>
										<option
											:value="defaultSelectOptionChoose"
											disabled
											:selected="regionProps.value === defaultSelectOptionChoose"
										>
											{{ defaultSelectOptionChoose }}
										</option>
										<option
											v-for="rgn in regions?.results"
											:key="rgn.alpha"
											:value="rgn.alpha"
											:selected="regionProps.value === rgn.alpha"
											class="text-primary-700 dark:text-primary-300"
										>
											{{ extractTranslated(rgn, 'name', locale) }}
										</option>
									</VeeField>
								</div>
								<span v-if="errors.region" class="text-sm text-red-600">{{
									errors.region
								}}</span>
							</div>
						</div>
					</div>
				</div>
				<CheckoutSidebar
					:shipping-price="shippingPrice"
					class="container rounded-lg bg-white p-6 text-white dark:bg-zinc-800 dark:text-black md:p-10"
				>
					<template #pay-ways>
						<CheckoutPayWays>
							<template #error>
								<span v-if="errors.payWay" class="text-center text-sm text-red-600">{{
									errors.payWay
								}}</span>
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
								class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
