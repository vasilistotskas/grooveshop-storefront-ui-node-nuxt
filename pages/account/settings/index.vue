<script lang="ts" setup>
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { defaultSelectOptionChoose } from '~/types/global/general'

const userStore = useUserStore()
const { account } = storeToRefs(userStore)
const { updateAccount } = userStore

const countryStore = useCountryStore()
const { countries } = storeToRefs(countryStore)
const { fetchCountries } = countryStore

const regionStore = useRegionStore()
const { regions } = storeToRefs(regionStore)
const { fetchRegions } = regionStore

const { t, locale } = useLang()
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

const { defineInputBinds, handleSubmit, errors, isSubmitting } = useForm({
	validationSchema,
	initialValues
})

const email = defineInputBinds('email')
const firstName = defineInputBinds('firstName')
const lastName = defineInputBinds('lastName')
const phone = defineInputBinds('phone')
const city = defineInputBinds('city')
const zipcode = defineInputBinds('zipcode')
const address = defineInputBinds('address')
const place = defineInputBinds('place')
const birthDate = defineInputBinds('birthDate')
const country = defineInputBinds('country')
const region = defineInputBinds('region')

const onCountryChange = async (event: Event) => {
	if (!(event.target instanceof HTMLSelectElement)) return
	await fetchRegions({
		alpha2: event.target.value
	})
	region.value.value = defaultSelectOptionChoose
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

const colorMode = useColorMode()
const dark = computed(() => colorMode.value === 'dark')
// Date picker
const flow: ('month' | 'year' | 'calendar' | 'time' | 'minutes' | 'hours' | 'seconds')[] =
	['year', 'month', 'calendar']
const date = ref(new Date())
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4">
		<PageHeader class="pb-4">
			<PageTitle :text="$t('pages.account.settings.title')" />
		</PageHeader>
		<nav class="user-account-navbar">
			<ul role="tablist" class="user-account-navbar-list">
				<li role="tab" class="user-account-navbar-list-item">
					<Anchor
						:to="`/account/settings`"
						:aria-label="$t('pages.account.settings.title')"
						:title="$t('pages.account.settings.title')"
						class="user-account-navbar-list-item-link"
					>
						<span class="text-black dark:text-white">
							{{ $t('pages.account.settings.title') }}
						</span>
					</Anchor>
				</li>
				<li role="tab" class="user-account-navbar-list-item">
					<Anchor
						:to="`/account/addresses`"
						:aria-label="$t('pages.account.settings.title')"
						:title="$t('pages.account.addresses.title')"
						class="user-account-navbar-list-item-link"
					>
						<span class="text-black dark:text-white">
							{{ $t('pages.account.addresses.title') }}
						</span>
					</Anchor>
				</li>
			</ul>
		</nav>
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
							:bind="firstName"
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
							:bind="lastName"
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
							:bind="phone"
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
							:bind="city"
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
							:bind="zipcode"
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
							:bind="address"
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
							:bind="place"
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
						<VueDatePicker
							v-model="birthDate.value"
							:locale="locale"
							:cancel-text="$t('pages.account.settings.form.date_picker.cancel')"
							:select-text="$t('pages.account.settings.form.date_picker.select')"
							:now-button-label="$t('pages.account.settings.form.date_picker.now')"
							:flow="flow"
							:dark="dark"
							:auto-apply="true"
							:max-date="date"
							:enable-time-picker="false"
						/>
					</div>
					<span v-if="errors.birthDate" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.birthDate
					}}</span>
				</div>
				<div class="grid">
					<label class="text-primary-700 dark:text-primary-100 mb-2" for="country">{{
						$t('pages.account.settings.form.country')
					}}</label>
					<div v-if="countries" class="grid">
						<select
							id="country"
							v-model="country.value"
							class="form-select text-primary-700 dark:text-primary-300 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8] border border-gray-200"
							name="country"
							@change="onCountryChange"
						>
							<option disabled value="choose">
								{{ $t('common.choose') }}
							</option>
							<option
								v-for="cntry in countries.results"
								:key="cntry.alpha2"
								class="text-primary-700 dark:text-primary-300"
								:value="cntry.alpha2"
							>
								{{ extractTranslated(cntry, 'name', locale) }}
							</option>
						</select>
					</div>
					<span v-if="errors.country" class="text-sm text-red-600 px-4 py-3 relative">{{
						errors.country
					}}</span>
				</div>
				<div class="grid">
					<label class="text-primary-700 dark:text-primary-100 mb-2" for="region">{{
						$t('pages.account.settings.form.region')
					}}</label>
					<div v-if="regions" class="grid">
						<select
							id="region"
							ref="regionSelectElement"
							v-model="region.value"
							class="form-select text-primary-700 dark:text-primary-300 bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8] border border-gray-200"
							name="region"
							:disabled="country.value === 'choose'"
						>
							<option disabled value="choose">
								{{ $t('common.choose') }}
							</option>
							<option
								v-for="rgn in regions.results"
								:key="rgn.alpha"
								class="text-primary-700 dark:text-primary-300"
								:value="rgn.alpha"
							>
								{{ extractTranslated(rgn, 'name', locale) }}
							</option>
						</select>
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
	width: 100%;
}

.user-account-navbar {
	position: fixed;
	top: 56px;
	left: 0;
	z-index: 10;
	width: 100%;
	box-shadow: 0 2px 4px 0 #dcdcdc;
	background-color: #fff;

	@media screen and (width >= 1020px) {
		position: static;
		width: auto;
		border-bottom: 1px solid #dcdcdc;
		box-shadow: none;
		background-color: transparent;
	}

	@media screen and (width <= 1020px) {
		padding-left: 1rem;
		padding-right: 1rem;
	}

	&-list {
		-ms-overflow-style: none;
		scrollbar-width: none;
		display: -webkit-box;
		display: flex;
		gap: 1rem;
		position: relative;
		overflow-x: auto;
		scroll-snap-type: x mandatory;

		@media screen and (width >= 1020px) {
			-webkit-box-pack: start;
			-ms-flex-pack: start;
			justify-content: flex-start;
		}

		&-item {
			&-link {
				font-size: 14px;
				line-height: 18px;
				display: block;
				outline: 0;
				padding: 16px 0;
				white-space: nowrap;
				color: #999;

				@media screen and (width <= 1020px) {
					padding: 8px 0;
				}

				&.router-link-active {
					border-bottom: 1px solid black;
				}
			}
		}
	}
}
</style>
