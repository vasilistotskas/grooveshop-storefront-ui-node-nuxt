<script lang="ts" setup>
import { z } from 'zod'
import type { RegistrationResendEmailBody } from '~/types/auth'
import type { DynamicFormSchema } from '~/types/form'

const { registrationVerifyEmail, registrationResendEmail } = useAuth()

const config = useRuntimeConfig()
const { t, locale } = useLang()
const breadcrumbUi = useBreadcrumbsUi()
const toast = useToast()
const route = useRoute('auth-registration-account-confirm-email-id___en')
const id = route.params.id

const { data, error } = await registrationVerifyEmail({
	key: id
})

async function onSubmit(values: RegistrationResendEmailBody) {
	const { data, error } = await registrationResendEmail({
		email: values.email
	})

	if (data.value) {
		toast.add({
			title:
				data.value?.detail ??
				t('pages.auth.registration.account-confirm-email.resend.success.title')
		})
	}

	if (error.value) {
		toast.add({
			title:
				error.value?.message ??
				t('pages.auth.registration.account-confirm-email.resend.error.title'),
			color: 'red'
		})
	}
}

const formSchema: DynamicFormSchema = {
	fields: [
		{
			label: t('pages.auth.registration.account-confirm-email.resend.form.email.label'),
			name: 'email',
			as: 'input',
			rules: z.string().email(),
			autocomplete: 'email',
			readonly: false,
			required: true,
			placeholder: '',
			type: 'email'
		}
	]
}

const items = defineBreadcrumbItems([
	{
		to: '/',
		ariaLabel: t('seoUi.breadcrumb.items.index.ariaLabel'),
		icon: 'material-symbols:home-outline-rounded'
	},
	{
		to:
			locale.value === config.public.defaultLocale
				? '/registration'
				: `/${locale.value}/registration`,
		label: t('seoUi.breadcrumb.items.auth.registration.label'),
		ariaLabel: t('seoUi.breadcrumb.items.auth.registration.ariaLabel')
	},
	{
		to:
			locale.value === config.public.defaultLocale
				? `/registration/account-confirm-email/${id}`
				: `/${locale.value}/registration/account-confirm-email/${id}`,
		label: t('seoUi.breadcrumb.items.auth.registration.account_confirm_email.label'),
		current: true
	}
])

definePageMeta({
	layout: 'page',
	middleware: 'guest'
})
</script>

<template>
	<PageWrapper class="container-xxs grid gap-12">
		<SBreadcrumb id="sub" :items="items" :ui="breadcrumbUi" />
		<PageTitle
			:text="$t('pages.auth.registration.account-confirm-email.title')"
			class="capitalize text-center"
		/>
		<PageBody>
			<ClientOnly>
				<LazyAlert
					v-if="data"
					:title="`${$t('pages.auth.registration.account-confirm-email.success.title')}`"
					:text="$t('pages.auth.registration.account-confirm-email.success.description')"
					:type="`success`"
					:close-button="false"
				/>
				<LazyAlert
					v-if="error"
					:title="`${$t('pages.auth.registration.account-confirm-email.error.title')}`"
					:text="$t('pages.auth.registration.account-confirm-email.error.description')"
					:type="`danger`"
					:close-button="false"
				/>
				<template #fallback>
					<ClientOnlyFallback
						height="130.8px"
						:text="$t('pages.auth.registration.account-confirm-email.loading')"
						:text-visibility="`visible`"
					/>
				</template>
			</ClientOnly>

			<div class="flex justify-center">
				<MainButton
					v-if="data"
					class="address-card-header-actions-button"
					type="link"
					:to="`/auth/login`"
					size="sm"
					:style="'secondary'"
				>
					{{ $t('pages.auth.registration.account-confirm-email.success.button') }}
				</MainButton>
				<LazyDynamicForm v-if="error" :schema="formSchema" @submit="onSubmit" />
			</div>
		</PageBody>
	</PageWrapper>
</template>
