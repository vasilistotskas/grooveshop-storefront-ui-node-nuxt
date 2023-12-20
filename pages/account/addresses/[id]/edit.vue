<script lang="ts" setup>
import { z } from 'zod'
import {
	defaultSelectOptionChoose,
	floorChoicesList,
	locationChoicesList
} from '~/constants/general'
import { FloorChoicesEnum, LocationChoicesEnum } from '~/types/global/general'

const userStore = useUserStore()
const { account } = storeToRefs(userStore)

const userAddressStore = useUserAddressStore()
const { address, pending } = storeToRefs(userAddressStore)
const { fetchAddress, setMainAddress, updateAddress } = userAddressStore

const countryStore = useCountryStore()
const { countries } = storeToRefs(countryStore)
const { fetchCountries } = countryStore

const regionStore = useRegionStore()
const { fetchRegions } = regionStore
const { regions } = storeToRefs(regionStore)

const { extractTranslated } = useTranslationExtractor()
const { t, locale } = useLang()
const toast = useToast()
const route = useRoute('account-addresses-id-edit___en')
const router = useRouter()

const addressId = route.params.id

await fetchAddress(addressId)

await fetchCountries()
await fetchRegions({
	alpha2: account?.value?.country || ''
})

const ZodAddress = z.object({
	title: z.string(),
	firstName: z.string(),
	lastName: z.string(),
	street: z.string(),
	streetNumber: z.string(),
	city: z.string(),
	zipcode: z.string(),
	floor: z.union([z.nativeEnum(FloorChoicesEnum), z.string()]).nullish(),
	locationType: z.union([z.nativeEnum(LocationChoicesEnum), z.string()]).nullish(),
	phone: z.string().nullish(),
	mobilePhone: z.string().nullish(),
	notes: z.string().nullish(),
	isMain: z.boolean().nullish(),
	user: z.number().nullish(),
	country: z.string().nullish(),
	region: z.string().nullish()
})
const validationSchema = toTypedSchema(ZodAddress)
const initialValues = ZodAddress.parse({
	title: address.value?.title || '',
	firstName: address.value?.firstName || '',
	lastName: address.value?.lastName || '',
	street: address.value?.street || '',
	streetNumber: address.value?.streetNumber || '',
	city: address.value?.city || '',
	zipcode: address.value?.zipcode || '',
	floor: address.value?.floor || defaultSelectOptionChoose,
	locationType: address.value?.locationType || defaultSelectOptionChoose,
	phone: address.value?.phone || '',
	mobilePhone: address.value?.mobilePhone || '',
	notes: address.value?.notes || '',
	isMain: address.value?.isMain || false,
	user: address.value?.user || null,
	country: address.value?.country || '',
	region: address.value?.region || defaultSelectOptionChoose
})
const { defineField, handleSubmit, errors, isSubmitting } = useForm({
	validationSchema,
	initialValues
})

const [title, titleProps] = defineField('title', {
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
const [city, cityProps] = defineField('city', {
	validateOnModelUpdate: true
})
const [zipcode, zipcodeProps] = defineField('zipcode', {
	validateOnModelUpdate: true
})
const [floor, floorProps] = defineField('floor', {
	validateOnModelUpdate: true
})
const [locationType, locationTypeProps] = defineField('locationType', {
	validateOnModelUpdate: true
})
const [phone, phoneProps] = defineField('phone', {
	validateOnModelUpdate: true
})
const [mobilePhone, mobilePhoneProps] = defineField('mobilePhone', {
	validateOnModelUpdate: true
})
const [notes, notesProps] = defineField('notes', {
	validateOnModelUpdate: true
})
const [isMain, isMainProps] = defineField('isMain', {
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
		alpha2: event.target.value
	})
	region.value = defaultSelectOptionChoose
}
const onSubmit = handleSubmit(async (values) => {
	if (String(floor) === defaultSelectOptionChoose) values.floor = null
	if (String(locationType) === defaultSelectOptionChoose) values.locationType = null
	await updateAddress(addressId, {
		title: values.title,
		firstName: values.firstName,
		lastName: values.lastName,
		street: values.street,
		streetNumber: values.streetNumber,
		city: values.city,
		zipcode: values.zipcode,
		floor: Number(values.floor),
		locationType: Number(values.locationType),
		phone: values.phone,
		mobilePhone: values.mobilePhone,
		notes: values.notes,
		isMain: values.isMain,
		user: values.user,
		country: values.country,
		region: values.region
	})
	toast.add({
		title: t('pages.account.addresses.edit.success')
	})
	await router.push('/account/addresses')
})

const onSetMain = async () => {
	await setMainAddress(addressId)
		.then(() => {
			toast.add({
				title: t('pages.account.addresses.edit.main.success')
			})
			router.push('/account/addresses')
		})
		.catch(() => {
			toast.add({
				title: t('pages.account.addresses.edit.main.error')
			})
		})
}

const submitButtonDisabled = computed(() => {
	return isSubmitting.value || Object.keys(errors.value).length > 0
})

definePageMeta({
	layout: 'user',
	middleware: 'auth'
})
</script>

<template>
	<PageWrapper class="grid gap-4">
		<PageHeader
			:class="[
				'grid grid-cols-auto-1fr gap-4 items-center justify-items-end',
				{ main: address?.isMain }
			]"
		>
			<div class="grid grid-cols-auto-1fr gap-4 items-center">
				<MainButton
					:type="'link'"
					:text="$t('common.back')"
					:to="{ name: 'account-addresses' }"
					size="sm"
				>
					<IconFa6Solid:arrowLeft />
				</MainButton>
				<PageTitle :text="`${$t('pages.account.addresses.edit.title')} ${address?.id}`" />
			</div>
			<template v-if="address?.isMain">
				<div class="flex items-center">
					<span class="text-green-500 dark:text-green-400 mr-2">
						<IconFa6Solid:circleCheck />
					</span>
					<span class="text-green-500 dark:text-green-400">
						{{ $t('pages.account.addresses.edit.main.title') }}
					</span>
				</div>
			</template>
			<template v-else>
				<MainButton
					class="gap-4"
					:text="$t('pages.account.addresses.edit.main.button')"
					@click="onSetMain"
				>
					<span class="text-primary-700 dark:text-primary-100">{{
						$t('pages.account.addresses.edit.main.button')
					}}</span>
					<IconFa6Solid:circleCheck />
				</MainButton>
			</template>
		</PageHeader>
		<PageBody>
			<form
				v-if="!pending.address && address"
				id="AddressEditForm"
				class="_form grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white dark:bg-zinc-800 rounded-lg"
				name="AddressEditForm"
				:action="`/api/v1/user/addresses/${address.id}`"
				method="post"
				@submit="onSubmit"
			>
				<div class="grid content-evenly items-start">
					<label class="text-primary-700 dark:text-primary-100 mb-2" for="title">{{
						$t('pages.account.addresses.edit.form.title')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="title"
							v-model="title"
							:bind="titleProps"
							class="text-primary-700 dark:text-primary-100 mb-2"
							name="title"
							type="text"
							:placeholder="$t('pages.account.addresses.edit.form.title')"
							autocomplete="honorific-prefix"
							:required="true"
						/>
					</div>
					<span v-if="errors.title" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.title
					}}</span>
				</div>
				<div class="grid content-evenly items-start">
					<label class="text-primary-700 dark:text-primary-100 mb-2" for="firstName">{{
						$t('pages.account.addresses.edit.form.first_name')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="firstName"
							v-model="firstName"
							:bind="firstNameProps"
							class="text-primary-700 dark:text-primary-100 mb-2"
							name="firstName"
							type="text"
							:placeholder="$t('pages.account.addresses.edit.form.first_name')"
							autocomplete="given-name"
							:required="true"
						/>
					</div>
					<span v-if="errors.firstName" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.firstName
					}}</span>
				</div>
				<div class="grid content-evenly items-start">
					<label class="text-primary-700 dark:text-primary-100 mb-2" for="lastName">{{
						$t('pages.account.addresses.edit.form.last_name')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="lastName"
							v-model="lastName"
							:bind="lastNameProps"
							class="text-primary-700 dark:text-primary-100 mb-2"
							name="lastName"
							type="text"
							:placeholder="$t('pages.account.addresses.edit.form.last_name')"
							autocomplete="family-name"
							:required="true"
						/>
					</div>
					<span v-if="errors.lastName" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.lastName
					}}</span>
				</div>
				<div class="grid content-evenly items-start">
					<label class="text-primary-700 dark:text-primary-100 mb-2" for="street">{{
						$t('pages.account.addresses.edit.form.street')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="street"
							v-model="street"
							:bind="streetProps"
							class="text-primary-700 dark:text-primary-100 mb-2"
							name="street"
							type="text"
							:placeholder="$t('pages.account.addresses.edit.form.street')"
							autocomplete="street-address"
							:required="true"
						/>
					</div>
					<span v-if="errors.street" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.street
					}}</span>
				</div>
				<div class="grid content-evenly items-start">
					<label class="text-primary-700 dark:text-primary-100 mb-2" for="streetNumber">{{
						$t('pages.account.addresses.edit.form.street_number')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="streetNumber"
							v-model="streetNumber"
							:bind="streetNumberProps"
							class="text-primary-700 dark:text-primary-100 mb-2"
							name="streetNumber"
							type="text"
							:placeholder="$t('pages.account.addresses.edit.form.street_number')"
							autocomplete="street-address"
							:required="true"
						/>
					</div>
					<span
						v-if="errors.streetNumber"
						class="text-sm text-red-600 px-4 py-3 relative"
						>{{ errors.streetNumber }}</span
					>
				</div>
				<div class="grid content-evenly items-start">
					<label class="text-primary-700 dark:text-primary-100 mb-2" for="city">{{
						$t('pages.account.addresses.edit.form.city')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="city"
							v-model="city"
							:bind="cityProps"
							class="text-primary-700 dark:text-primary-100 mb-2"
							name="city"
							type="text"
							:placeholder="$t('pages.account.addresses.edit.form.city')"
							autocomplete="address-level2"
							:required="true"
						/>
					</div>
					<span v-if="errors.city" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.city
					}}</span>
				</div>
				<div class="grid content-evenly items-start">
					<label class="text-primary-700 dark:text-primary-100 mb-2" for="zipcode">{{
						$t('pages.account.addresses.edit.form.zipcode')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="zipcode"
							v-model="zipcode"
							:bind="zipcodeProps"
							class="text-primary-700 dark:text-primary-100 mb-2"
							name="zipcode"
							type="text"
							:placeholder="$t('pages.account.addresses.edit.form.zipcode')"
							autocomplete="postal-code"
							:required="true"
						/>
					</div>
					<span v-if="errors.zipcode" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.zipcode
					}}</span>
				</div>
				<div class="grid content-evenly items-start">
					<label class="text-primary-700 dark:text-primary-100 mb-2" for="phone">{{
						$t('pages.account.addresses.edit.form.phone')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="phone"
							v-model="phone"
							:bind="phoneProps"
							class="text-primary-700 dark:text-primary-100 mb-2"
							name="phone"
							type="text"
							:placeholder="$t('pages.account.addresses.edit.form.phone')"
							autocomplete="tel"
						/>
					</div>
					<span v-if="errors.phone" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.phone
					}}</span>
				</div>
				<div class="grid content-evenly items-start">
					<label class="text-primary-700 dark:text-primary-100 mb-2" for="mobilePhone">{{
						$t('pages.account.addresses.edit.form.mobile_phone')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="mobilePhone"
							v-model="mobilePhone"
							:bind="mobilePhoneProps"
							class="text-primary-700 dark:text-primary-100 mb-2"
							name="mobilePhone"
							type="text"
							:placeholder="$t('pages.account.addresses.edit.form.mobile_phone')"
							autocomplete="tel"
						/>
					</div>
					<span
						v-if="errors.mobilePhone"
						class="text-sm text-red-600 px-4 py-3 relative"
						>{{ errors.mobilePhone }}</span
					>
				</div>

				<div class="grid content-evenly items-start gap-4">
					<div class="grid">
						<label class="text-primary-700 dark:text-primary-100 mb-2" for="floor">{{
							$t('pages.account.addresses.edit.form.floor')
						}}</label>
						<VeeField
							id="floor"
							v-model="floor"
							v-bind="floorProps"
							name="floor"
							as="select"
							class="form-select text-primary-700 dark:text-primary-300 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8] border border-gray-200"
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
						<span v-if="errors.floor" class="text-sm text-red-600 px-4 py-3 relative">{{
							errors.floor
						}}</span>
					</div>
					<div class="grid">
						<label
							class="text-primary-700 dark:text-primary-100 mb-2"
							for="locationType"
							>{{ $t('pages.account.addresses.edit.form.location_type') }}</label
						>
						<VeeField
							id="locationType"
							v-model="locationType"
							v-bind="locationTypeProps"
							name="locationType"
							as="select"
							class="form-select text-primary-700 dark:text-primary-300 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8] border border-gray-200"
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
						<span
							v-if="errors.locationType"
							class="text-sm text-red-600 px-4 py-3 relative"
							>{{ errors.locationType }}</span
						>
					</div>
				</div>

				<div class="grid content-evenly items-start gap-4">
					<div class="grid">
						<label class="text-primary-700 dark:text-primary-100 mb-2" for="country">{{
							$t('pages.account.addresses.edit.form.country')
						}}</label>
						<div class="grid">
							<VeeField
								id="country"
								v-model="country"
								v-bind="countryProps"
								name="country"
								as="select"
								class="form-select text-primary-700 dark:text-primary-300 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8] border border-gray-200"
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
						<span v-if="errors.country" class="text-sm text-red-600 px-4 py-3 relative">{{
							errors.country
						}}</span>
					</div>
					<div class="grid">
						<label class="text-primary-700 dark:text-primary-100 mb-2" for="region">{{
							$t('pages.account.addresses.edit.form.region')
						}}</label>
						<div class="grid">
							<VeeField
								id="region"
								v-model="region"
								v-bind="regionProps"
								name="region"
								as="select"
								class="form-select text-primary-700 dark:text-primary-300 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8] border border-gray-200"
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
						<span v-if="errors.region" class="text-sm text-red-600 px-4 py-3 relative">{{
							errors.region
						}}</span>
					</div>
				</div>

				<div class="grid content-evenly items-start">
					<label class="text-primary-700 dark:text-primary-100 mb-2" for="notes">{{
						$t('pages.account.addresses.edit.form.notes')
					}}</label>
					<div class="grid">
						<VeeField
							id="notes"
							v-model="notes"
							as="textarea"
							v-bind="notesProps"
							class="w-full text-primary-700 dark:text-primary-100 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8] border border-gray-200"
							name="notes"
							type="text"
							rows="4"
							:placeholder="$t('pages.account.addresses.edit.form.notes')"
						/>
					</div>
				</div>

				<div class="grid items-end justify-end col-start-3">
					<button
						type="submit"
						class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
						:disabled="submitButtonDisabled"
						:aria-busy="isSubmitting"
					>
						{{ $t('pages.account.addresses.edit.form.update') }}
					</button>
				</div>
			</form>
		</PageBody>
	</PageWrapper>
</template>
