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
const route = useRoute('account-addresses-id-edit___en')
const router = useRouter()
const userStore = useUserStore()
const userAddressStore = useUserAddressStore()
const countryStore = useCountryStore()
const regionStore = useRegionStore()
const { address, pending, error } = storeToRefs(userAddressStore)
const { account } = storeToRefs(userStore)
const { countries } = storeToRefs(countryStore)
const { regions } = storeToRefs(regionStore)

const addressId = route.params.id

try {
	await userAddressStore.fetchAddress(addressId)
} catch (error) {
	//
}

try {
	await countryStore.fetchCountries()
	await regionStore.fetchRegions({
		alpha2: account.value?.country ?? ''
	})
} catch (error) {
	//
}

const ZodAddress = z.object({
	title: z
		.string()
		.min(3, t('pages.account.addresses.edit.validation.title.min', { min: 3 })),
	firstName: z
		.string()
		.min(3, t('pages.account.addresses.edit.validation.first_name.min', { min: 3 })),
	lastName: z
		.string()
		.min(3, t('pages.account.addresses.edit.validation.last_name.min', { min: 3 })),
	street: z
		.string()
		.min(3, t('pages.account.addresses.edit.validation.street.min', { min: 3 })),
	streetNumber: z
		.string()
		.min(1, t('pages.account.addresses.edit.validation.street_number.min', { min: 1 })),
	city: z
		.string()
		.min(3, t('pages.account.addresses.edit.validation.city.min', { min: 3 })),
	zipcode: z
		.string()
		.min(3, t('pages.account.addresses.edit.validation.zipcode.min', { min: 3 })),
	floor: z.union([z.nativeEnum(FloorChoicesEnum), z.string()]).nullish(),
	locationType: z.union([z.nativeEnum(LocationChoicesEnum), z.string()]).nullish(),
	phone: z.string().nullish(),
	mobilePhone: z.string().nullish(),
	notes: z.string().nullish(),
	isMain: z.boolean().nullish(),
	user: z.number().nullish(),
	country: z.string(),
	region: z.string().refine((value) => value !== defaultSelectOptionChoose, {
		message: t('common.validation.region.required')
	})
})
const validationSchema = toTypedSchema(ZodAddress)
const initialValues = ZodAddress.parse({
	title: address.value?.title ?? '',
	firstName: address.value?.firstName ?? '',
	lastName: address.value?.lastName ?? '',
	street: address.value?.street ?? '',
	streetNumber: address.value?.streetNumber ?? '',
	city: address.value?.city ?? '',
	zipcode: address.value?.zipcode ?? '',
	floor: address.value?.floor ?? defaultSelectOptionChoose,
	locationType: address.value?.locationType ?? defaultSelectOptionChoose,
	phone: address.value?.phone ?? null,
	mobilePhone: address.value?.mobilePhone ?? '',
	notes: address.value?.notes ?? '',
	isMain: address.value?.isMain ?? false,
	user: address.value?.user ?? null,
	country: address.value?.country ?? '',
	region: address.value?.region ?? defaultSelectOptionChoose
})
const { handleSubmit, errors, isSubmitting } = useForm({
	validationSchema,
	initialValues
})
const { value: title }: FieldContext<string> = useField('title')
const { value: firstName }: FieldContext<string> = useField('firstName')
const { value: lastName }: FieldContext<string> = useField('lastName')
const { value: street }: FieldContext<string> = useField('street')
const { value: streetNumber }: FieldContext<string> = useField('streetNumber')
const { value: city }: FieldContext<string> = useField('city')
const { value: zipcode }: FieldContext<string> = useField('zipcode')
const { value: floor }: FieldContext<number> = useField('floor')
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
const onSubmit = handleSubmit((values) => {
	if (String(floor) === defaultSelectOptionChoose) values.floor = null
	if (String(locationType) === defaultSelectOptionChoose) values.locationType = null
	userAddressStore
		.updateAddress(addressId, {
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
		.then(() => {
			toast.success(t('pages.account.addresses.edit.success'))
			router.push('/account/addresses')
		})
		.catch(() => {
			toast.error(t('pages.account.addresses.edit.error'))
		})
})

const onSetMain = () => {
	userAddressStore
		.setMainAddress(addressId)
		.then(() => {
			toast.success(t('pages.account.addresses.edit.main.success'))
			router.push('/account/addresses')
		})
		.catch(() => {
			toast.error(t('pages.account.addresses.edit.main.error'))
		})
}

const submitButtonDisabled = computed(() => {
	return isSubmitting.value || Object.keys(errors.value).length > 0
})

definePageMeta({
	layout: 'user'
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
				<Button
					:type="'link'"
					:text="$t('common.back')"
					:to="{ name: 'account-addresses' }"
					size="sm"
				>
					<IconFa6Solid:arrowLeft />
				</Button>
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
				<Button
					class="gap-4"
					:text="$t('pages.account.addresses.edit.main.button')"
					@click="onSetMain"
				>
					<span class="text-gray-700 dark:text-gray-200">{{
						$t('pages.account.addresses.edit.main.button')
					}}</span>
					<IconFa6Solid:circleCheck />
				</Button>
			</template>
		</PageHeader>
		<PageBody>
			<Error
				v-if="error.address"
				:code="error.address.statusCode"
				:error="error.address"
			/>
			<LoadingSkeleton
				v-else-if="pending.address"
				:card-height="'512px'"
				:class="pending.address ? 'block' : 'hidden'"
				:loading="pending.address"
				:columns="1"
				:columns-md="1"
				:columns-lg="1"
				:replicas="1"
			></LoadingSkeleton>
			<form
				v-if="!pending.address && !error.address && address"
				id="AddressEditForm"
				class="_form grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg"
				name="AddressEditForm"
				:action="`/api/v1/user/addresses/${address.id}`"
				method="post"
				@submit="onSubmit"
			>
				<div class="grid content-evenly items-start">
					<label class="text-gray-700 dark:text-gray-200 mb-2" for="title">{{
						$t('pages.account.addresses.edit.form.title')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="title"
							v-model="title"
							class="text-gray-700 dark:text-gray-200 mb-2"
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
					<label class="text-gray-700 dark:text-gray-200 mb-2" for="firstName">{{
						$t('pages.account.addresses.edit.form.first_name')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="firstName"
							v-model="firstName"
							class="text-gray-700 dark:text-gray-200 mb-2"
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
					<label class="text-gray-700 dark:text-gray-200 mb-2" for="lastName">{{
						$t('pages.account.addresses.edit.form.last_name')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="lastName"
							v-model="lastName"
							class="text-gray-700 dark:text-gray-200 mb-2"
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
					<label class="text-gray-700 dark:text-gray-200 mb-2" for="street">{{
						$t('pages.account.addresses.edit.form.street')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="street"
							v-model="street"
							class="text-gray-700 dark:text-gray-200 mb-2"
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
					<label class="text-gray-700 dark:text-gray-200 mb-2" for="streetNumber">{{
						$t('pages.account.addresses.edit.form.street_number')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="streetNumber"
							v-model="streetNumber"
							class="text-gray-700 dark:text-gray-200 mb-2"
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
					<label class="text-gray-700 dark:text-gray-200 mb-2" for="city">{{
						$t('pages.account.addresses.edit.form.city')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="city"
							v-model="city"
							class="text-gray-700 dark:text-gray-200 mb-2"
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
					<label class="text-gray-700 dark:text-gray-200 mb-2" for="zipcode">{{
						$t('pages.account.addresses.edit.form.zipcode')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="zipcode"
							v-model="zipcode"
							class="text-gray-700 dark:text-gray-200 mb-2"
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
					<label class="text-gray-700 dark:text-gray-200 mb-2" for="phone">{{
						$t('pages.account.addresses.edit.form.phone')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="phone"
							v-model="phone"
							class="text-gray-700 dark:text-gray-200 mb-2"
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
					<label class="text-gray-700 dark:text-gray-200 mb-2" for="mobilePhone">{{
						$t('pages.account.addresses.edit.form.mobile_phone')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="mobilePhone"
							v-model="mobilePhone"
							class="text-gray-700 dark:text-gray-200 mb-2"
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
						<label class="text-gray-700 dark:text-gray-200 mb-2" for="floor">{{
							$t('pages.account.addresses.edit.form.floor')
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
						<label class="text-gray-700 dark:text-gray-200 mb-2" for="locationType">{{
							$t('pages.account.addresses.edit.form.location_type')
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
						<label class="text-gray-700 dark:text-gray-200 mb-2" for="country">{{
							$t('pages.account.addresses.edit.form.country')
						}}</label>
						<div v-if="countries" class="grid">
							<select
								id="country"
								v-model="country"
								title="country"
								class="form-select text-gray-700 dark:text-gray-300 bg-gray-100/[0.8] dark:bg-slate-800/[0.8] border border-gray-200"
								name="country"
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
						<label class="text-gray-700 dark:text-gray-200 mb-2" for="region">{{
							$t('pages.account.addresses.edit.form.region')
						}}</label>
						<div v-if="regions" class="grid">
							<select
								id="region"
								ref="regionSelectElement"
								v-model="region.value"
								title="region"
								class="form-select text-gray-700 dark:text-gray-300 bg-gray-100/[0.8] dark:bg-slate-800/[0.8] border border-gray-200"
								name="region"
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
					<label class="text-gray-700 dark:text-gray-200 mb-2" for="notes">{{
						$t('pages.account.addresses.edit.form.notes')
					}}</label>
					<div class="grid">
						<textarea
							id="notes"
							v-model="notes"
							class="w-full text-gray-700 dark:text-gray-200 bg-gray-100/[0.8] dark:bg-slate-800/[0.8] border border-gray-200"
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

<style lang="scss" scoped></style>
