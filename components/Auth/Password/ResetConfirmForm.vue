<script lang="ts" setup>
import { z } from 'zod'

const { passwordResetConfirm } = useAuth()

const { t } = useI18n()
const toast = useToast()
const route = useRoute('auth-password-reset-confirm-uid-token___en')
const uid = route.params.uid
const token = route.params.token

const ZodPasswordResetConfirm = z
	.object({
		newPassword1: z.string().min(8).max(255),
		newPassword2: z.string().min(8).max(255),
		uid: z.string(),
		token: z.string()
	})
	.refine((data) => data.newPassword1 === data.newPassword2, {
		message: t('pages.auth.password.reset.confirm.form.newPassword2.errors.match'),
		path: ['newPassword2']
	})

const initialValues = {
	newPassword1: '',
	newPassword2: '',
	uid,
	token
}

const validationSchema = toTypedSchema(ZodPasswordResetConfirm)

const { defineField, handleSubmit, errors, isSubmitting } = useForm({
	validationSchema,
	initialValues
})

const [newPassword1, newPassword1Props] = defineField('newPassword1', {
	validateOnModelUpdate: true
})
const [newPassword2, newPassword2Props] = defineField('newPassword2', {
	validateOnModelUpdate: true
})

const onSubmit = handleSubmit(async (values) => {
	const { data, error } = await passwordResetConfirm({
		newPassword1: values.newPassword1,
		newPassword2: values.newPassword2,
		uid: values.uid,
		token: values.token
	})

	if (data.value) {
		toast.add({
			title: data.value?.detail ?? t('pages.auth.password.reset.confirm.success.title')
		})
	}

	if (error.value) {
		toast.add({
			title: error.value?.message ?? t('pages.auth.password.reset.confirm.error.title'),
			color: 'red'
		})
	}
})
</script>

<template>
	<section class="grid">
		<form
			id="passwordResetConfirmForm"
			ref="passwordResetConfirmForm"
			class="container-xxs p-0 md:px-20"
			name="passwordResetConfirmForm"
			@submit="onSubmit"
		>
			<div
				class="p-4 md:p-8 flex h-full flex-wrap items-center justify-center lg:justify-between bg-white dark:bg-zinc-800 border border-gray-900/10 dark:border-gray-50/[0.2] rounded-[0.5rem] shadow-[0_4px_9px_-4px_#0000000d] dark:shadow-[0_4px_9px_-4px_#0000000d]"
			>
				<div class="relative grid w-full">
					<div class="hidden">
						<label for="email">{{
							$t('pages.auth.password.reset.confirm.form.email.label')
						}}</label>
						<input
							id="email"
							type="text"
							name="email"
							value="..."
							autocomplete="username email"
							style="display: none"
						/>
					</div>

					<div class="grid content-evenly items-start">
						<label
							class="text-primary-700 dark:text-primary-100 mb-2"
							for="newPassword1"
							>{{
								$t('pages.auth.password.reset.confirm.form.newPassword1.label')
							}}</label
						>
						<FormTextInput
							id="newPassword1"
							v-model="newPassword1"
							:bind="newPassword1Props"
							class="text-primary-700 dark:text-primary-100 mb-2"
							name="newPassword1"
							type="password"
							autocomplete="new-password"
							:required="true"
						/>
						<span
							v-if="errors.newPassword1"
							class="text-sm text-red-600 px-4 py-3 relative"
							>{{ errors.newPassword1 }}</span
						>
					</div>

					<div class="grid content-evenly items-start">
						<label
							class="text-primary-700 dark:text-primary-100 mb-2"
							for="newPassword2"
							>{{
								$t('pages.auth.password.reset.confirm.form.newPassword2.label')
							}}</label
						>
						<FormTextInput
							id="newPassword2"
							v-model="newPassword2"
							:bind="newPassword2Props"
							class="text-primary-700 dark:text-primary-100 mb-2"
							name="newPassword2"
							type="password"
							autocomplete="new-password"
							:required="true"
						/>
						<span
							v-if="errors.newPassword2"
							class="text-sm text-red-600 px-4 py-3 relative"
							>{{ errors.newPassword2 }}</span
						>
					</div>

					<button
						type="submit"
						class="inline-block w-full rounded bg-primary px-7 pb-2.5 pt-3 text-sm font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
						:disabled="isSubmitting"
						:aria-busy="isSubmitting"
					>
						{{ $t('pages.auth.password.reset.confirm.form.submit') }}
					</button>
				</div>
			</div>
		</form>
	</section>
</template>
