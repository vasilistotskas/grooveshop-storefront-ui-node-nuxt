<script lang="ts" setup>
import { z } from 'zod'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'

const { registrationVerifyEmail, registrationResendEmail } = useAuth()

const { t } = useLang()
const toast = useToast()
const route = useRoute('auth-registration-account-confirm-email-id___en')
const id = route.params.id

const ZodRegistrationResendEmail = z.object({
	email: z.string().email()
})

const validationSchema = toTypedSchema(ZodRegistrationResendEmail)
const { defineInputBinds, handleSubmit, errors, isSubmitting } = useForm({
	validationSchema
})
const email = defineInputBinds('email')

const { data, error } = await registrationVerifyEmail({
	key: id
})

const onSubmit = handleSubmit(async (values) => {
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
})

definePageMeta({
	layout: 'page',
	middleware: 'guest'
})
useServerHead(() => ({
	title: t('pages.auth.registration.account-confirm-email.title'),
	meta: [
		{
			name: 'description',
			content: t('pages.auth.registration.account-confirm-email.description')
		},
		{
			name: 'keywords',
			content: t('pages.auth.registration.account-confirm-email.keywords')
		}
	]
}))
useServerSeoMeta({
	title: t('pages.auth.registration.account-confirm-email.title'),
	description: t('pages.auth.registration.account-confirm-email.description'),
	ogTitle: t('pages.auth.registration.account-confirm-email.title'),
	ogDescription: t('pages.auth.registration.account-confirm-email.description'),
	ogImage: '',
	ogUrl: route.path,
	twitterTitle: t('pages.auth.registration.account-confirm-email.title'),
	twitterDescription: t('pages.auth.registration.account-confirm-email.description'),
	twitterImage: ''
})
</script>

<template>
	<PageWrapper class="container-xxs grid gap-12">
		<PageTitle
			:text="$t('pages.auth.registration.account-confirm-email.title')"
			class="capitalize text-center"
		/>
		<PageBody>
			<ClientOnly>
				<Alert
					v-if="data"
					:title="`${$t('pages.auth.registration.account-confirm-email.success.title')}`"
					:text="$t('pages.auth.registration.account-confirm-email.success.description')"
					:type="`success`"
					:close-button="false"
				/>
				<Alert
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
				<form
					v-if="error"
					id="resendEmailForm"
					ref="resendEmailForm"
					class="container-xxs p-0 md:px-20"
					name="resendEmailForm"
					@submit="onSubmit"
				>
					<div
						class="p-4 md:p-8 flex h-full flex-wrap items-center justify-center lg:justify-between bg-white dark:bg-zinc-800 border border-gray-900/10 dark:border-gray-50/[0.2] rounded-[0.5rem] shadow-[0_4px_9px_-4px_#0000000d] dark:shadow-[0_4px_9px_-4px_#0000000d]"
					>
						<div class="relative grid gap-4 w-full">
							<div class="grid content-evenly items-start">
								<label class="text-primary-700 dark:text-primary-100" for="email">{{
									$t('pages.auth.login.form.email.label')
								}}</label>
								<FormTextInput
									id="email"
									:bind="email"
									class="text-primary-700 dark:text-primary-100"
									name="email"
									type="email"
									autocomplete="email"
									:required="true"
								/>
								<span
									v-if="errors.email"
									class="text-sm text-red-600 px-4 py-3 relative"
									>{{ errors.email }}</span
								>
							</div>
							<button
								type="submit"
								class="inline-block w-full rounded bg-primary px-7 pb-2.5 pt-3 text-sm font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
								:disabled="isSubmitting"
								:aria-busy="isSubmitting"
							>
								{{ $t('pages.auth.registration.account-confirm-email.resend.button') }}
							</button>
						</div>
					</div>
				</form>
			</div>
		</PageBody>
	</PageWrapper>
</template>
