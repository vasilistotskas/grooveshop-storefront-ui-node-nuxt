<script lang="ts" setup>
import { z } from 'zod'
import {
	defaultSelectOptionChoose,
	FloorChoicesEnum,
	floorChoicesList,
	LocationChoicesEnum,
	locationChoicesList
} from '~/types/global/general'
import { documentTypeEnum, StatusEnum } from '~/types/order/order'
import { ZodOrderCreateItem } from '~/types/order/order-item'

const cartStore = useCartStore()
const { getCartItems } = storeToRefs(cartStore)

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

const { t, locale } = useLang()
const router = useRouter()
const toast = useToast()
const config = useRuntimeConfig()
const breadcrumbUi = useBreadcrumbsUi()
const { extractTranslated } = useTranslationExtractor()

const shippingPrice = ref(3)

await fetchCountries()

const ZodCheckout = z.object({
	country: z.string().refine((value) => value !== defaultSelectOptionChoose, {
		message: t('common.validation.region.required')
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
const { defineInputBinds, setFieldValue, handleSubmit, errors, isSubmitting } = useForm({
	validationSchema,
	initialValues: {
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

const email = defineInputBinds('email')
const firstName = defineInputBinds('firstName')
const lastName = defineInputBinds('lastName')
const street = defineInputBinds('street')
const streetNumber = defineInputBinds('streetNumber')
const zipcode = defineInputBinds('zipcode')
const place = defineInputBinds('place')
const city = defineInputBinds('city')
const phone = defineInputBinds('phone')
const mobilePhone = defineInputBinds('mobilePhone')
const customerNotes = defineInputBinds('customerNotes')
const floor = defineInputBinds('floor')
const locationType = defineInputBinds('locationType')
const country = defineInputBinds('country')
const region = defineInputBinds('region')

const onCountryChange = async (event: Event) => {
	if (!(event.target instanceof HTMLSelectElement)) return
	await fetchRegions({
		alpha2: event.target.value
	})
	region.value.value = defaultSelectOptionChoose
}

const onSubmit = handleSubmit(async (values) => {
	const { data, error } = await createOrder(values)
	if (data.value?.id) {
		toast.add({
			title: t('pages.checkout.form.submit.success'),
			color: 'green'
		})
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

const items = defineBreadcrumbItems([
	{
		to: '/',
		ariaLabel: t('seoUi.breadcrumb.items.index.ariaLabel'),
		icon: 'material-symbols:home-outline-rounded'
	},
	{
		to: locale.value === config.public.defaultLocale ? '/cart' : `/${locale.value}/cart`,
		label: t('seoUi.breadcrumb.items.cart.label'),
		ariaLabel: t('seoUi.breadcrumb.items.cart.ariaLabel')
	},
	{
		to:
			locale.value === config.public.defaultLocale
				? '/checkout'
				: `/${locale.value}/checkout`,
		label: t('seoUi.breadcrumb.items.checkout.label'),
		current: true
	}
])

watch(
	() => getSelectedPayWayId.value,
	() => {
		setFieldValue('payWay', getSelectedPayWayId.value || undefined)
	}
)

definePageMeta({
	layout: 'page'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4">
		<SBreadcrumb id="sub" :items="items" :ui="breadcrumbUi" />
		<PageTitle :text="$t('pages.checkout.title')" class="capitalize" />
		<PageBody>
			<form
				id="checkoutForm"
				class="_form grid gap-2 md:grid-cols-2fr-1fr md:gap-4"
				name="checkoutForm"
				@submit="onSubmit"
			>
				<div
					class="container p-2 md:p-10 bg-white text-white dark:bg-zinc-800 dark:text-black rounded-lg"
				>
					<div class="grid md:grid-cols-2 gap-4">
						<div class="grid">
							<label
								class="text-primary-700 dark:text-primary-100 mb-2"
								for="firstName"
								>{{ $t('pages.checkout.form.first_name') }}</label
							>
							<div class="grid">
								<FormTextInput
									id="firstName"
									:bind="firstName"
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
							<label class="text-primary-700 dark:text-primary-100 mb-2" for="lastName">{{
								$t('pages.checkout.form.last_name')
							}}</label>
							<div class="grid">
								<FormTextInput
									id="lastName"
									:bind="lastName"
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
							<label class="text-primary-700 dark:text-primary-100 mb-2" for="email">{{
								$t('pages.checkout.form.email')
							}}</label>
							<div class="grid">
								<FormTextInput
									id="email"
									:bind="email"
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
							<label class="text-primary-700 dark:text-primary-100 mb-2" for="phone">{{
								$t('pages.checkout.form.phone')
							}}</label>
							<div class="grid">
								<FormTextInput
									id="phone"
									:bind="phone"
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
								class="text-primary-700 dark:text-primary-100 mb-2"
								for="mobilePhone"
								>{{ $t('pages.checkout.form.mobile_phone') }}</label
							>
							<div class="grid">
								<FormTextInput
									id="mobilePhone"
									:bind="mobilePhone"
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
							<label class="text-primary-700 dark:text-primary-100 mb-2" for="city">{{
								$t('pages.checkout.form.city')
							}}</label>
							<div class="grid">
								<FormTextInput
									id="city"
									:bind="city"
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
							<label class="text-primary-700 dark:text-primary-100 mb-2" for="place">{{
								$t('pages.checkout.form.place')
							}}</label>
							<div class="grid">
								<FormTextInput
									id="place"
									:bind="place"
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
							<label class="text-primary-700 dark:text-primary-100 mb-2" for="zipcode">{{
								$t('pages.checkout.form.zipcode')
							}}</label>
							<div class="grid">
								<FormTextInput
									id="zipcode"
									:bind="zipcode"
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
							<label class="text-primary-700 dark:text-primary-100 mb-2" for="street">{{
								$t('pages.checkout.form.street')
							}}</label>
							<div class="grid">
								<FormTextInput
									id="street"
									:bind="street"
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
								class="text-primary-700 dark:text-primary-100 mb-2"
								for="streetNumber"
								>{{ $t('pages.checkout.form.street_number') }}</label
							>
							<div class="grid">
								<FormTextInput
									id="streetNumber"
									:bind="streetNumber"
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

						<div class="grid col-span-2">
							<label
								class="text-primary-700 dark:text-primary-100 mb-2"
								for="customerNotes"
								>{{ $t('pages.checkout.form.customer_notes') }}</label
							>
							<div class="grid">
								<VeeField
									id="customerNotes"
									as="textarea"
									v-bind="customerNotes"
									:placeholder="$t('pages.checkout.form.customer_notes')"
									class="w-full text-primary-700 dark:text-primary-100 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8] border border-gray-200"
									name="customerNotes"
									rows="4"
									type="text"
								/>
							</div>
						</div>
					</div>
					<div class="grid md:grid-cols-2 gap-4">
						<div class="grid content-evenly items-start gap-4">
							<div class="grid">
								<label class="text-primary-700 dark:text-primary-100 mb-2" for="floor">{{
									$t('pages.checkout.form.floor')
								}}</label>
								<VeeField
									id="floor"
									v-bind="floor"
									name="floor"
									as="select"
									class="form-select text-primary-700 dark:text-primary-300 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8] border border-gray-200"
								>
									<option
										:value="defaultSelectOptionChoose"
										disabled
										:selected="floor.value === defaultSelectOptionChoose"
									>
										{{ defaultSelectOptionChoose }}
									</option>
									<option
										v-for="(floorChoice, index) in floorChoicesList"
										:key="index"
										:value="index"
										:selected="Number(floor.value) === index"
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
									v-bind="locationType"
									name="locationType"
									as="select"
									class="form-select text-primary-700 dark:text-primary-300 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8] border border-gray-200"
								>
									<option
										:value="defaultSelectOptionChoose"
										disabled
										:selected="locationType.value === defaultSelectOptionChoose"
									>
										{{ defaultSelectOptionChoose }}
									</option>
									<option
										v-for="(location, index) in locationChoicesList"
										:key="index"
										:value="index"
										:selected="Number(locationType.value) === index"
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
										v-bind="country"
										name="country"
										as="select"
										class="form-select text-primary-700 dark:text-primary-300 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8] border border-gray-200"
										@change.capture="onCountryChange"
									>
										<option
											:value="defaultSelectOptionChoose"
											disabled
											:selected="country.value === defaultSelectOptionChoose"
										>
											{{ defaultSelectOptionChoose }}
										</option>
										<option
											v-for="cntry in countries?.results"
											:key="cntry.alpha2"
											:value="cntry.alpha2"
											:selected="country.value === cntry.alpha2"
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
										v-bind="region"
										name="region"
										as="select"
										class="form-select text-primary-700 dark:text-primary-300 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8] border border-gray-200"
										:disabled="country.value === defaultSelectOptionChoose"
									>
										<option
											:value="defaultSelectOptionChoose"
											disabled
											:selected="region.value === defaultSelectOptionChoose"
										>
											{{ defaultSelectOptionChoose }}
										</option>
										<option
											v-for="rgn in regions?.results"
											:key="rgn.alpha"
											:value="rgn.alpha"
											:selected="region.value === rgn.alpha"
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
					class="container p-2 md:p-10 bg-white text-white dark:bg-zinc-800 dark:text-black rounded-lg"
				>
					<template #pay-ways>
						<CheckoutPayWays>
							<template #error>
								<span v-if="errors.payWay" class="text-sm text-red-600 text-center">{{
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
								class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
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

<style lang="scss" scoped>
.form-select {
	background-image: none;
	border-radius: 4px;
	box-shadow: inset 0 1px 1px rgb(0 0 0 / 8%);
	display: block;
	font-size: 14px;
	height: 43px;
	line-height: 1.4286;
	padding: 11px 12px;
	transition: all 0.3s ease-in-out;
	vertical-align: middle;
	width: 100%;
}
</style>
