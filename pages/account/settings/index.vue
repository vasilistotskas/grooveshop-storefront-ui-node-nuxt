<script lang="ts" setup>
import { z } from 'zod'
import { defaultSelectOptionChoose } from '~/constants/general'

const userStore = useUserStore()
const { account } = storeToRefs(userStore)
const { updateAccount } = userStore

const countryStore = useCountryStore()
const { countries } = storeToRefs(countryStore)
const { fetchCountries } = countryStore

const regionStore = useRegionStore()
const { regions } = storeToRefs(regionStore)
const { fetchRegions } = regionStore

const { t, locale } = useI18n()
const { extractTranslated } = useTranslationExtractor()
const toast = useToast()

const userId = account.value?.id

await fetchCountries()
await fetchRegions({
	alpha2: account.value?.country ?? ''
})

const ZodAccountSettings = z.object({
	email: z.string().email({
		message: t('pages.account.settings.validation.email.invalid')
	}),
	firstName: z.string(),
	lastName: z.string(),
	phone: z.string(),
	city: z.string(),
	zipcode: z.string(),
	address: z.string(),
	place: z.string(),
	birthDate: z.coerce
		.date({
			required_error: t('common.validation.date.required_error'),
			invalid_type_error: t('common.validation.date.invalid_type_error')
		})
		.nullish(),
	country: z.string().default(defaultSelectOptionChoose).nullish(),
	region: z.string().default(defaultSelectOptionChoose).nullish()
})

const validationSchema = toTypedSchema(ZodAccountSettings)

const initialValues = ZodAccountSettings.parse({
	email: account.value?.email || '',
	firstName: account.value?.firstName || '',
	lastName: account.value?.lastName || '',
	phone: account.value?.phone || '',
	city: account.value?.city || '',
	zipcode: account.value?.zipcode || '',
	address: account.value?.address || '',
	place: account.value?.place || '',
	birthDate:
		account.value?.birthDate || new Date('2000-01-01').toISOString().slice(0, 10),
	country: account.value?.country || defaultSelectOptionChoose,
	region: account.value?.region || defaultSelectOptionChoose
})

const { defineField, handleSubmit, errors, isSubmitting } = useForm({
	validationSchema,
	initialValues
})

const [email] = defineField('email')
const [firstName, firstNameProps] = defineField('firstName', {
	validateOnModelUpdate: true
})
const [lastName, lastNameProps] = defineField('lastName', {
	validateOnModelUpdate: true
})
const [phone, phoneProps] = defineField('phone', { validateOnModelUpdate: true })
const [city, cityProps] = defineField('city', { validateOnModelUpdate: true })
const [zipcode, zipcodeProps] = defineField('zipcode', {
	validateOnModelUpdate: true
})
const [address, addressProps] = defineField('address', {
	validateOnModelUpdate: true
})
const [place, placeProps] = defineField('place', { validateOnModelUpdate: true })
const [country, countryProps] = defineField('country', {
	validateOnModelUpdate: true
})
const [region, regionProps] = defineField('region', { validateOnModelUpdate: true })
const [birthDate] = defineField('birthDate')

const date = ref(new Date())

const label = computed(() => {
	if (birthDate.value) {
		return birthDate.value.toLocaleDateString('en-us', {
			weekday: 'long',
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		})
	}
	return date.value.toLocaleDateString('en-us', {
		weekday: 'long',
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	})
})

const onCountryChange = async (event: Event) => {
	if (!(event.target instanceof HTMLSelectElement)) return
	await fetchRegions({
		alpha2: event.target.value
	})
	regionProps.value.value = defaultSelectOptionChoose
}

const onSubmit = handleSubmit((values) => {
	if (
		values.region === defaultSelectOptionChoose ||
		values.country === defaultSelectOptionChoose
	) {
		values.region = null
		values.country = null
	}

	if (userId === undefined) return
	updateAccount(userId, {
		email: values.email,
		firstName: values.firstName,
		lastName: values.lastName,
		phone: values.phone,
		city: values.city,
		zipcode: values.zipcode,
		address: values.address,
		place: values.place,
		birthDate: values.birthDate?.toISOString().slice(0, 10),
		country: values.country,
		region: values.region
	})
		.then(() => {
			toast.add({ title: t('pages.account.settings.form.success') })
		})
		.catch(() => {
			toast.add({ title: t('pages.account.settings.form.error') })
		})
})

const submitButtonDisabled = computed(() => {
	return isSubmitting.value || Object.keys(errors.value).length > 0
})

definePageMeta({
	layout: 'user',
	middleware: 'auth'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4">
		<PageHeader class="pb-4">
			<PageTitle :text="$t('pages.account.settings.title')" />
		</PageHeader>
		<UserAccountNavbar />
		<div class="grid items-center justify-start pt-4">
			<span
				class="text-primary-500 dark:text-primary-400 cursor-not-allowed italic p-2 border rounded-md border-gray-900/10 dark:border-gray-50/[0.2]"
				>{{ email }}</span
			>
		</div>
		<PageBody>
			<form
				id="accountSettingsForm"
				class="_form grid grid-cols-2 gap-4"
				name="accountSettingsForm"
				@submit="onSubmit"
			>
				<div class="grid">
					<label class="text-primary-700 dark:text-primary-100 mb-2" for="firstName">{{
						$t('pages.account.settings.form.first_name')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="firstName"
							v-model="firstName"
							:bind="firstNameProps"
							class="text-primary-700 dark:text-primary-100 mb-2"
							name="firstName"
							type="text"
							:placeholder="$t('pages.account.settings.form.first_name')"
							autocomplete="given-name"
							:required="true"
						/>
					</div>
					<span v-if="errors.firstName" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.firstName
					}}</span>
				</div>
				<div class="grid">
					<label class="text-primary-700 dark:text-primary-100 mb-2" for="lastName">{{
						$t('pages.account.settings.form.last_name')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="lastName"
							v-model="lastName"
							:bind="lastNameProps"
							class="text-primary-700 dark:text-primary-100 mb-2"
							name="lastName"
							type="text"
							:placeholder="$t('pages.account.settings.form.last_name')"
							autocomplete="family-name"
							:required="true"
						/>
					</div>
					<span v-if="errors.lastName" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.lastName
					}}</span>
				</div>
				<div class="grid">
					<label class="text-primary-700 dark:text-primary-100 mb-2" for="phone">{{
						$t('pages.account.settings.form.phone')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="phone"
							v-model="phone"
							:bind="phoneProps"
							class="text-primary-700 dark:text-primary-100 mb-2"
							name="phone"
							type="text"
							:placeholder="$t('pages.account.settings.form.phone')"
							autocomplete="tel"
						/>
					</div>
					<span v-if="errors.phone" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.phone
					}}</span>
				</div>
				<div class="grid">
					<label class="text-primary-700 dark:text-primary-100 mb-2" for="city">{{
						$t('pages.account.settings.form.city')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="city"
							v-model="city"
							:bind="cityProps"
							class="text-primary-700 dark:text-primary-100 mb-2"
							name="city"
							type="text"
							:placeholder="$t('pages.account.settings.form.city')"
							autocomplete="address-level2"
						/>
					</div>
					<span v-if="errors.city" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.city
					}}</span>
				</div>
				<div class="grid">
					<label class="text-primary-700 dark:text-primary-100 mb-2" for="zipcode">{{
						$t('pages.account.settings.form.zipcode')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="zipcode"
							v-model="zipcode"
							:bind="zipcodeProps"
							class="text-primary-700 dark:text-primary-100 mb-2"
							name="zipcode"
							type="text"
							:placeholder="$t('pages.account.settings.form.zipcode')"
							autocomplete="postal-code"
						/>
					</div>
					<span v-if="errors.zipcode" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.zipcode
					}}</span>
				</div>
				<div class="grid">
					<label class="text-primary-700 dark:text-primary-100 mb-2" for="address">{{
						$t('pages.account.settings.form.address')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="address"
							v-model="address"
							:bind="addressProps"
							class="text-primary-700 dark:text-primary-100 mb-2"
							name="address"
							type="text"
							:placeholder="$t('pages.account.settings.form.address')"
							autocomplete="street-address"
						/>
					</div>
					<span v-if="errors.address" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.address
					}}</span>
				</div>
				<div class="grid">
					<label class="text-primary-700 dark:text-primary-100 mb-2" for="place">{{
						$t('pages.account.settings.form.place')
					}}</label>
					<div class="grid">
						<FormTextInput
							id="place"
							v-model="place"
							:bind="placeProps"
							class="text-primary-700 dark:text-primary-100 mb-2"
							name="place"
							type="text"
							:placeholder="$t('pages.account.settings.form.place')"
							autocomplete="address-level3"
						/>
					</div>
					<span v-if="errors.place" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.place
					}}</span>
				</div>
				<div class="grid">
					<label class="text-primary-700 dark:text-primary-100 mb-2" for="birthDate">{{
						$t('pages.account.settings.form.birth_date')
					}}</label>
					<div class="grid">
						<UPopover :popper="{ placement: 'bottom-start' }">
							<UButton icon="i-heroicons-calendar-days-20-solid" :label="label" />
							<template #panel="{ close }">
								<LazyDatePicker id="birthDate" v-model="birthDate" @close="close" />
							</template>
						</UPopover>
					</div>
					<span v-if="errors.birthDate" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.birthDate
					}}</span>
				</div>
				<div class="grid">
					<label class="text-primary-700 dark:text-primary-100 mb-2" for="country">{{
						$t('pages.account.settings.form.country')
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
						$t('pages.account.settings.form.region')
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

				<div class="grid items-end justify-end">
					<button
						type="submit"
						class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
						:disabled="submitButtonDisabled"
						:aria-busy="isSubmitting"
					>
						{{ $t('pages.account.settings.form.submit') }}
					</button>
				</div>
			</form>
		</PageBody>
	</PageWrapper>
</template>
