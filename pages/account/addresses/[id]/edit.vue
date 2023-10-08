<script lang="ts" setup>
import { z } from 'zod'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import {
	defaultSelectOptionChoose,
	FloorChoicesEnum,
	floorChoicesList,
	LocationChoicesEnum,
	locationChoicesList
} from '~/types/global/general'

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
	phone: address.value?.phone || null,
	mobilePhone: address.value?.mobilePhone || '',
	notes: address.value?.notes || '',
	isMain: address.value?.isMain || false,
	user: address.value?.user || null,
	country: address.value?.country || '',
	region: address.value?.region || defaultSelectOptionChoose
})
const { defineInputBinds, handleSubmit, errors, isSubmitting } = useForm({
	validationSchema,
	initialValues
})

const title = defineInputBinds('title')
const firstName = defineInputBinds('firstName')
const lastName = defineInputBinds('lastName')
const street = defineInputBinds('street')
const streetNumber = defineInputBinds('streetNumber')
const city = defineInputBinds('city')
const zipcode = defineInputBinds('zipcode')
const floor = defineInputBinds('floor')
const locationType = defineInputBinds('locationType')
const phone = defineInputBinds('phone')
const mobilePhone = defineInputBinds('mobilePhone')
const notes = defineInputBinds('notes')
const isMain = defineInputBinds('isMain')
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
							:bind="title"
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
							:bind="firstName"
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
							:bind="lastName"
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
							:bind="street"
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
							:bind="streetNumber"
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
							:bind="city"
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
							:bind="zipcode"
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
							:bind="phone"
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
							:bind="mobilePhone"
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
							v-slot="{ value }"
							name="floor"
							as="select"
							class="form-select text-primary-700 dark:text-primary-300 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8] border border-gray-200"
							:disabled="floor.value === 'choose'"
						>
							<option :value="defaultSelectOptionChoose" disabled>
								{{ defaultSelectOptionChoose }}
							</option>
							<option
								v-for="(floorChoice, index) in floorChoicesList"
								:key="index"
								:value="index"
								:selected="value && value.includes(floorChoice)"
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
							v-slot="{ value }"
							name="locationType"
							as="select"
							class="form-select text-primary-700 dark:text-primary-300 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8] border border-gray-200"
							:disabled="locationType.value === 'choose'"
						>
							<option :value="defaultSelectOptionChoose" disabled>
								{{ defaultSelectOptionChoose }}
							</option>
							<option
								v-for="(location, index) in locationChoicesList"
								:key="index"
								:value="index"
								:selected="value && value.includes(location)"
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
								v-slot="{ value }"
								name="country"
								as="select"
								class="form-select text-primary-700 dark:text-primary-300 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8] border border-gray-200"
								@change="onCountryChange"
							>
								<option :value="defaultSelectOptionChoose" disabled>
									{{ defaultSelectOptionChoose }}
								</option>
								<option
									v-for="cntry in countries?.results"
									:key="cntry.alpha2"
									:value="cntry.alpha2"
									:selected="value && value.includes(cntry.alpha2)"
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
								v-slot="{ value }"
								name="region"
								as="select"
								class="form-select text-primary-700 dark:text-primary-300 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8] border border-gray-200"
								:disabled="country.value === 'choose'"
							>
								<option :value="defaultSelectOptionChoose" disabled>
									{{ defaultSelectOptionChoose }}
								</option>
								<option
									v-for="rgn in regions?.results"
									:key="rgn.alpha"
									:value="rgn.alpha"
									:selected="value && value.includes(rgn.alpha)"
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
							as="textarea"
							v-bind="notes"
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
