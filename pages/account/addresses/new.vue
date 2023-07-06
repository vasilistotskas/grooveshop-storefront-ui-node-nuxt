<script lang="ts" setup>
import { z } from 'zod'
import { toTypedSchema } from '@vee-validate/zod'
import { FieldContext, useField, useForm } from 'vee-validate'
import {
	defaultSelectOptionChoose,
	FloorChoicesEnum,
	floorChoicesList,
	LocationChoicesEnum,
	locationChoicesList
} from '~/zod/global/general'

const { t } = useLang()
const toast = useToast()
const router = useRouter()
const userStore = useUserStore()
const userAddressStore = useUserAddressStore()
const countryStore = useCountryStore()
const regionStore = useRegionStore()
const { account } = storeToRefs(userStore)
const { countries } = storeToRefs(countryStore)
const { regions } = storeToRefs(regionStore)

await countryStore.fetchCountries()
await regionStore.fetchRegions({
	alpha2: account.value?.country ?? ''
})

const ZodAddress = z.object({
	title: z
		.string()
		.min(3, t('pages.account.addresses.new.validation.title.min', { min: 3 })),
	firstName: z
		.string()
		.min(3, t('pages.account.addresses.new.validation.first_name.min', { min: 3 })),
	lastName: z
		.string()
		.min(3, t('pages.account.addresses.new.validation.last_name.min', { min: 3 })),
	street: z
		.string()
		.min(3, t('pages.account.addresses.new.validation.street.min', { min: 3 })),
	streetNumber: z
		.string()
		.min(1, t('pages.account.addresses.new.validation.street_number.min', { min: 1 })),
	city: z
		.string()
		.min(3, t('pages.account.addresses.new.validation.city.min', { min: 3 })),
	zipcode: z
		.string()
		.min(3, t('pages.account.addresses.new.validation.zipcode.min', { min: 3 })),
	floor: z.union([z.nativeEnum(FloorChoicesEnum), z.string()]).nullish(),
	locationType: z.union([z.nativeEnum(LocationChoicesEnum), z.string()]).nullish(),
	phone: z.string().nullish(),
	mobilePhone: z.string().nullish(),
	notes: z.string().nullish(),
	isMain: z.boolean().nullish(),
	user: z.number().nullish(),
	country: z.string().refine((value) => value !== defaultSelectOptionChoose, {
		message: t('common.validation.region.required')
	}),
	region: z.string().refine((value) => value !== defaultSelectOptionChoose, {
		message: t('common.validation.region.required')
	})
})
const validationSchema = toTypedSchema(ZodAddress)
const { handleSubmit, errors, isSubmitting } = useForm({
	validationSchema,
	initialValues: {
		isMain: false,
		country: defaultSelectOptionChoose,
		region: defaultSelectOptionChoose,
		floor: defaultSelectOptionChoose,
		locationType: defaultSelectOptionChoose
	}
})
const { value: title }: FieldContext<string> = useField('title')
const { value: firstName }: FieldContext<string> = useField('firstName')
const { value: lastName }: FieldContext<string> = useField('lastName')
const { value: street }: FieldContext<string> = useField('street')
const { value: streetNumber }: FieldContext<string> = useField('streetNumber')
const { value: city }: FieldContext<string> = useField('city')
const { value: zipcode }: FieldContext<string> = useField('zipcode')
const { value: floor }: FieldContext<string> = useField('floor')
const { value: locationType }: FieldContext<string> = useField('locationType')
const { value: phone }: FieldContext<string> = useField('phone')
const { value: mobilePhone }: FieldContext<string> = useField('mobilePhone')
const { value: notes }: FieldContext<string> = useField('notes')
const { value: isMain }: FieldContext<boolean> = useField('isMain')
const { value: country }: FieldContext<string> = useField('country')
const region = reactive(useField('region'))

const onCountryChange = (event: Event) => {
	if (!(event.target instanceof HTMLSelectElement)) return
	regionStore.fetchRegions({
		alpha2: event.target.value
	})
	region.value = defaultSelectOptionChoose
}

const onSubmit = handleSubmit(async (values) => {
	if (String(floor) === defaultSelectOptionChoose) values.floor = null
	if (String(locationType) === defaultSelectOptionChoose) values.locationType = null
	await userAddressStore
		.createAddress({
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
			user: account.value?.id,
			country: values.country,
			region: values.region
		})
		.then(() => {
			toast.success(t('pages.account.addresses.new.success'))
			router.push('/account/addresses')
		})
		.catch(() => {
			toast.error(t('pages.account.addresses.new.error'))
		})
})

const submitButtonDisabled = computed(() => {
	return isSubmitting.value || Object.keys(errors.value).length > 0
})

definePageMeta({
	layout: 'user'
})
</script>

<template>
	<PageWrapper class="grid gap-4">
		<PageHeader>
			<div class="grid grid-cols-auto-1fr gap-4 items-center justify-items">
				<Button
					:type="'link'"
					:text="$t('common.back')"
					:to="{ name: 'account-addresses' }"
					size="sm"
				>
					<IconFa6Solid:arrowLeft />
				</Button>
				<PageTitle class="text-center">{{
					$t('pages.account.addresses.new.title')
				}}</PageTitle>
			</div>
		</PageHeader>
		<PageBody>
			<form
				id="AddressEditForm"
				class="_form grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg"
				name="AddressEditForm"
				@submit="onSubmit"
			>
				<div class="grid content-evenly items-start">
					<label class="text-gray-700 dark:text-gray-200" for="title">{{
						$t('pages.account.addresses.new.form.title')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="title"
							v-model="title"
							class="text-gray-700 dark:text-gray-200"
							name="title"
							type="text"
							:placeholder="$t('pages.account.addresses.new.form.title')"
							autocomplete="honorific-prefix"
							:required="true"
						/>
					</div>
					<span v-if="errors.title" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.title
					}}</span>
				</div>
				<div class="grid content-evenly items-start">
					<label class="text-gray-700 dark:text-gray-200" for="firstName">{{
						$t('pages.account.addresses.new.form.first_name')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="firstName"
							v-model="firstName"
							class="text-gray-700 dark:text-gray-200"
							name="firstName"
							type="text"
							:placeholder="$t('pages.account.addresses.new.form.first_name')"
							autocomplete="given-name"
							:required="true"
						/>
					</div>
					<span v-if="errors.firstName" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.firstName
					}}</span>
				</div>
				<div class="grid content-evenly items-start">
					<label class="text-gray-700 dark:text-gray-200" for="lastName">{{
						$t('pages.account.addresses.new.form.last_name')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="lastName"
							v-model="lastName"
							class="text-gray-700 dark:text-gray-200"
							name="lastName"
							type="text"
							:placeholder="$t('pages.account.addresses.new.form.last_name')"
							autocomplete="family-name"
							:required="true"
						/>
					</div>
					<span v-if="errors.lastName" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.lastName
					}}</span>
				</div>
				<div class="grid content-evenly items-start">
					<label class="text-gray-700 dark:text-gray-200" for="street">{{
						$t('pages.account.addresses.new.form.street')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="street"
							v-model="street"
							class="text-gray-700 dark:text-gray-200"
							name="street"
							type="text"
							:placeholder="$t('pages.account.addresses.new.form.street')"
							autocomplete="street-address"
							:required="true"
						/>
					</div>
					<span v-if="errors.street" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.street
					}}</span>
				</div>
				<div class="grid content-evenly items-start">
					<label class="text-gray-700 dark:text-gray-200" for="streetNumber">{{
						$t('pages.account.addresses.new.form.street_number')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="streetNumber"
							v-model="streetNumber"
							class="text-gray-700 dark:text-gray-200"
							name="streetNumber"
							type="text"
							:placeholder="$t('pages.account.addresses.new.form.street_number')"
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
					<label class="text-gray-700 dark:text-gray-200" for="city">{{
						$t('pages.account.addresses.new.form.city')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="city"
							v-model="city"
							class="text-gray-700 dark:text-gray-200"
							name="city"
							type="text"
							:placeholder="$t('pages.account.addresses.new.form.city')"
							autocomplete="address-level2"
							:required="true"
						/>
					</div>
					<span v-if="errors.city" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.city
					}}</span>
				</div>
				<div class="grid content-evenly items-start">
					<label class="text-gray-700 dark:text-gray-200" for="zipcode">{{
						$t('pages.account.addresses.new.form.zipcode')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="zipcode"
							v-model="zipcode"
							class="text-gray-700 dark:text-gray-200"
							name="zipcode"
							type="text"
							:placeholder="$t('pages.account.addresses.new.form.zipcode')"
							autocomplete="postal-code"
							:required="true"
						/>
					</div>
					<span v-if="errors.zipcode" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.zipcode
					}}</span>
				</div>
				<div class="grid content-evenly items-start">
					<label class="text-gray-700 dark:text-gray-200" for="phone">{{
						$t('pages.account.addresses.new.form.phone')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="phone"
							v-model="phone"
							class="text-gray-700 dark:text-gray-200"
							name="phone"
							type="text"
							:placeholder="$t('pages.account.addresses.new.form.phone')"
							autocomplete="tel"
						/>
					</div>
					<span v-if="errors.phone" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.phone
					}}</span>
				</div>
				<div class="grid content-evenly items-start">
					<label class="text-gray-700 dark:text-gray-200" for="mobilePhone">{{
						$t('pages.account.addresses.new.form.mobile_phone')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="mobilePhone"
							v-model="mobilePhone"
							class="text-gray-700 dark:text-gray-200"
							name="mobilePhone"
							type="text"
							:placeholder="$t('pages.account.addresses.new.form.mobile_phone')"
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
						<label class="text-gray-700 dark:text-gray-200" for="floor">{{
							$t('pages.account.addresses.new.form.floor')
						}}</label>
						<select
							id="inputFloor"
							v-model="floor"
							title="floor"
							class="form-select text-gray-700 dark:text-gray-300 bg-gray-100/[0.8] dark:bg-slate-800/[0.8] border border-gray-200"
							name="floor"
						>
							<option disabled value="choose">
								{{ $t('common.choose') }}
							</option>
							<option
								v-for="(floorChoice, index) in floorChoicesList"
								:key="index"
								:value="index"
							>
								{{ floorChoice }}
							</option>
						</select>
						<span v-if="errors.floor" class="text-sm text-red-600 px-4 py-3 relative">{{
							errors.floor
						}}</span>
					</div>
					<div class="grid">
						<label class="text-gray-700 dark:text-gray-200" for="locationType">{{
							$t('pages.account.addresses.new.form.location_type')
						}}</label>
						<select
							id="inputLocationType"
							v-model="locationType"
							title="locationType"
							class="form-select text-gray-700 dark:text-gray-300 bg-gray-100/[0.8] dark:bg-slate-800/[0.8] border border-gray-200"
							name="locationType"
						>
							<option disabled value="choose">
								{{ $t('common.choose') }}
							</option>
							<option
								v-for="(location, index) in locationChoicesList"
								:key="index"
								:value="index"
							>
								{{ location }}
							</option>
						</select>
						<span
							v-if="errors.locationType"
							class="text-sm text-red-600 px-4 py-3 relative"
							>{{ errors.locationType }}</span
						>
					</div>
				</div>

				<div class="grid content-evenly items-start gap-4">
					<div class="grid">
						<label class="text-gray-700 dark:text-gray-200" for="country">{{
							$t('pages.account.addresses.new.form.country')
						}}</label>
						<div v-if="countries" class="grid">
							<select
								id="country"
								v-model="country"
								title="country"
								class="form-select text-gray-700 dark:text-gray-300 bg-gray-100/[0.8] dark:bg-slate-800/[0.8] border border-gray-200"
								name="country"
								required
								@change="onCountryChange"
							>
								<option disabled value="choose">
									{{ $t('common.choose') }}
								</option>
								<option
									v-for="cntry in countries.results"
									:key="cntry.alpha2"
									class="text-gray-700 dark:text-gray-300"
									:value="cntry.alpha2"
								>
									{{ cntry.name }}
								</option>
							</select>
						</div>
						<span v-if="errors.country" class="text-sm text-red-600 px-4 py-3 relative">{{
							errors.country
						}}</span>
					</div>
					<div class="grid">
						<label class="text-gray-700 dark:text-gray-200" for="region">{{
							$t('pages.account.addresses.new.form.region')
						}}</label>
						<div v-if="regions" class="grid">
							<select
								id="region"
								ref="regionSelectElement"
								v-model="region.value"
								title="region"
								class="form-select text-gray-700 dark:text-gray-300 bg-gray-100/[0.8] dark:bg-slate-800/[0.8] border border-gray-200"
								name="region"
								required
							>
								<option disabled value="choose">
									{{ $t('common.choose') }}
								</option>
								<option
									v-for="rgn in regions.results"
									:key="rgn.alpha"
									class="text-gray-700 dark:text-gray-300"
									:value="rgn.alpha"
								>
									{{ rgn.name }}
								</option>
							</select>
						</div>
						<span v-if="errors.region" class="text-sm text-red-600 px-4 py-3 relative">{{
							errors.region
						}}</span>
					</div>
				</div>

				<div class="grid content-evenly items-start">
					<label class="text-gray-700 dark:text-gray-200" for="notes">{{
						$t('pages.account.addresses.new.form.notes')
					}}</label>
					<div class="grid">
						<textarea
							id="notes"
							v-model="notes"
							class="w-full text-gray-700 dark:text-gray-200 bg-gray-100/[0.8] dark:bg-slate-800/[0.8] border border-gray-200"
							name="notes"
							type="text"
							rows="4"
							:placeholder="$t('pages.account.addresses.new.form.notes')"
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
						{{ $t('pages.account.addresses.new.form.submit') }}
					</button>
				</div>
			</form>
		</PageBody>
	</PageWrapper>
</template>

<style lang="scss" scoped></style>
