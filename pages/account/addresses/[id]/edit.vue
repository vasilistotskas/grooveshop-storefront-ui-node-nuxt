<script lang="ts" setup>
import { z } from 'zod'

import {
	defaultSelectOptionChoose,
	floorChoicesList,
	locationChoicesList
} from '~/constants/general'
import { GlobalEvents } from '~/events/global'
import type { UserAddressPayload } from '~/events/user/address'
import type { Country } from '~/types/country'
import { FloorChoicesEnum, LocationChoicesEnum } from '~/types/global/general'
import type { Pagination } from '~/types/pagination'
import type { Region } from '~/types/region'
import { ZodUserAccount } from '~/types/user/account'
import type { UserAddress } from '~/types/user/address'

const { extractTranslated } = useTranslationExtractor()
const { t, locale } = useI18n()
const toast = useToast()
const route = useRoute('account-addresses-id-edit___en')
const bus = useEventBus<string, UserAddressPayload>(GlobalEvents.USER_ADDRESS)

const addressId = Number(route.params.id)

const userStore = useUserStore()
const { setMainAddress } = userStore

const { data: address } = await useFetch<UserAddress>(
	`/api/user/addresses/${addressId}`,
	{
		key: `address${addressId}`,
		method: 'GET'
	}
)

const ZodUserAddress = z.object({
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
	user: z.union([z.number(), ZodUserAccount]),
	country: z.string().nullish(),
	region: z.string().nullish()
})
const validationSchema = toTypedSchema(ZodUserAddress)
const initialValues = ZodUserAddress.parse({
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
	country: address.value?.country || defaultSelectOptionChoose,
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

const { data: countries } = await useLazyAsyncData('countries', () =>
	$fetch<Pagination<Country>>('/api/countries', {
		method: 'GET'
	})
)

const { data: regions } = await useLazyAsyncData(
	'regions',
	() =>
		$fetch<Pagination<Region>>('/api/regions', {
			method: 'GET',
			params: {
				country: country.value
			}
		}),
	{
		watch: [country]
	}
)

const onCountryChange = (event: Event) => {
	if (!(event.target instanceof HTMLSelectElement)) return
	country.value = event.target.value
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

	await useFetch<UserAddress>(`/api/user/addresses/${addressId}`, {
		method: 'PUT',
		body: {
			title: updatedValues.title,
			firstName: updatedValues.firstName,
			lastName: updatedValues.lastName,
			street: updatedValues.street,
			streetNumber: updatedValues.streetNumber,
			city: updatedValues.city,
			zipcode: updatedValues.zipcode,
			floor: Number(updatedValues.floor),
			locationType: Number(updatedValues.locationType),
			phone: updatedValues.phone,
			mobilePhone: updatedValues.mobilePhone,
			notes: updatedValues.notes,
			isMain: updatedValues.isMain,
			user: updatedValues.user,
			country: updatedValues.country,
			region: updatedValues.region
		},
		onRequestError() {
			toast.add({
				title: t('pages.account.addresses.edit.error'),
				color: 'red'
			})
		},
		async onResponse() {
			toast.add({
				title: t('pages.account.addresses.edit.success')
			})
			await navigateTo('/account/addresses')
		},
		onResponseError() {
			toast.add({
				title: t('pages.account.addresses.edit.error'),
				color: 'red'
			})
		}
	})
})

const onSetMain = async () => {
	await useFetch(`/api/user/addresses/${addressId}/set-main`, {
		method: 'POST',
		onRequestError() {
			toast.add({
				title: t('pages.account.addresses.edit.main.error'),
				color: 'red'
			})
		},
		async onResponse() {
			toast.add({
				title: t('pages.account.addresses.edit.main.success')
			})
			setMainAddress(addressId)
			await navigateTo('/account/addresses')
		},
		onResponseError() {
			toast.add({
				title: t('pages.account.addresses.edit.main.error'),
				color: 'red'
			})
		}
	})
}

const submitButtonDisabled = computed(() => {
	return isSubmitting.value || Object.keys(errors.value).length > 0
})

definePageMeta({
	layout: 'user',
	keepalive: false
})
</script>

<template>
	<PageWrapper class="grid gap-4">
		<PageHeader
			:class="[
				'grid grid-cols-auto-1fr items-center justify-items-end gap-4',
				{ main: address?.isMain }
			]"
		>
			<div class="grid grid-cols-auto-1fr items-center gap-4">
				<UButton
					icon="i-heroicons-arrow-left"
					size="sm"
					:to="'/account/addresses'"
					:trailing="true"
					color="white"
				>
					<span class="sr-only">{{ $t('pages.account.addresses.edit.back') }}</span>
				</UButton>
				<PageTitle :text="`${$t('pages.account.addresses.edit.title')} ${address?.id}`" />
			</div>
			<div v-if="address?.isMain" class="flex items-center">
				<span class="mr-2 text-green-500 dark:text-green-400">
					<IconFa6Solid:circleCheck />
				</span>
				<span class="text-green-500 dark:text-green-400">
					{{ $t('pages.account.addresses.edit.main.title') }}
				</span>
			</div>
			<UButton
				v-else
				icon="i-heroicons-check-circle"
				:label="$t('pages.account.addresses.edit.main.button')"
				class="gap-4"
				:trailing="true"
				color="white"
				@click="onSetMain"
			/>
		</PageHeader>
		<PageBody>
			<form
				v-if="address"
				id="AddressEditForm"
				class="_form grid grid-cols-1 gap-4 rounded-lg bg-white p-4 dark:bg-zinc-800 md:grid-cols-3"
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
					<span v-if="errors.title" class="relative px-4 py-3 text-sm text-red-600">{{
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
					<span v-if="errors.firstName" class="relative px-4 py-3 text-sm text-red-600">{{
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
					<span v-if="errors.lastName" class="relative px-4 py-3 text-sm text-red-600">{{
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
					<span v-if="errors.street" class="relative px-4 py-3 text-sm text-red-600">{{
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
						class="relative px-4 py-3 text-sm text-red-600"
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
					<span v-if="errors.city" class="relative px-4 py-3 text-sm text-red-600">{{
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
					<span v-if="errors.zipcode" class="relative px-4 py-3 text-sm text-red-600">{{
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
					<span v-if="errors.phone" class="relative px-4 py-3 text-sm text-red-600">{{
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
						class="relative px-4 py-3 text-sm text-red-600"
						>{{ errors.mobilePhone }}</span
					>
				</div>

				<div class="grid content-evenly items-start gap-2">
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
							class="form-select text-primary-700 dark:text-primary-300 border border-gray-200 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8]"
						>
							<option
								:value="defaultSelectOptionChoose"
								disabled
								:selected="floor === defaultSelectOptionChoose"
							>
								{{ defaultSelectOptionChoose }}
							</option>
							<option
								v-for="(floorChoice, index) in floorChoicesList"
								:key="index"
								:value="index"
								:selected="Number(floor) === index"
								class="text-primary-700 dark:text-primary-300"
							>
								{{ floorChoice }}
							</option>
						</VeeField>
						<span v-if="errors.floor" class="relative px-4 py-3 text-sm text-red-600">{{
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
							class="form-select text-primary-700 dark:text-primary-300 border border-gray-200 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8]"
						>
							<option
								:value="defaultSelectOptionChoose"
								disabled
								:selected="locationType === defaultSelectOptionChoose"
							>
								{{ defaultSelectOptionChoose }}
							</option>
							<option
								v-for="(location, index) in locationChoicesList"
								:key="index"
								:value="index"
								:selected="Number(locationType) === index"
								class="text-primary-700 dark:text-primary-300"
							>
								{{ location }}
							</option>
						</VeeField>
						<span
							v-if="errors.locationType"
							class="relative px-4 py-3 text-sm text-red-600"
							>{{ errors.locationType }}</span
						>
					</div>
				</div>

				<div class="grid content-evenly items-start gap-2">
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
								class="form-select text-primary-700 dark:text-primary-300 border border-gray-200 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8]"
								@change.capture="onCountryChange"
							>
								<option
									:value="defaultSelectOptionChoose"
									disabled
									:selected="country === defaultSelectOptionChoose"
								>
									{{ defaultSelectOptionChoose }}
								</option>
								<option
									v-for="cntry in countries?.results"
									:key="cntry.alpha2"
									:value="cntry.alpha2"
									:selected="country === cntry.alpha2"
									class="text-primary-700 dark:text-primary-300"
								>
									{{ extractTranslated(cntry, 'name', locale) }}
								</option>
							</VeeField>
						</div>
						<span v-if="errors.country" class="relative px-4 py-3 text-sm text-red-600">{{
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
								class="form-select text-primary-700 dark:text-primary-300 border border-gray-200 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8]"
								:disabled="country === defaultSelectOptionChoose"
							>
								<option
									:value="defaultSelectOptionChoose"
									disabled
									:selected="region === defaultSelectOptionChoose"
								>
									{{ defaultSelectOptionChoose }}
								</option>
								<option
									v-for="rgn in regions?.results"
									:key="rgn.alpha"
									:value="rgn.alpha"
									:selected="region === rgn.alpha"
									class="text-primary-700 dark:text-primary-300"
								>
									{{ extractTranslated(rgn, 'name', locale) }}
								</option>
							</VeeField>
						</div>
						<span v-if="errors.region" class="relative px-4 py-3 text-sm text-red-600">{{
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
							class="text-input text-primary-700 dark:text-primary-100 w-full flex-1 rounded-l rounded-r border border-gray-900/10 bg-transparent px-4 py-2 text-base outline-none focus:border-gray-900 dark:border-gray-50/[0.2] dark:focus:border-white"
							name="notes"
							type="text"
							rows="4"
							:placeholder="$t('pages.account.addresses.edit.form.notes')"
						/>
					</div>
				</div>

				<div class="col-start-3 grid items-end justify-end">
					<button
						type="submit"
						class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
