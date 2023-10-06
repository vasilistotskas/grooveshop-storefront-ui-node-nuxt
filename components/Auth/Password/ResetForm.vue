<script lang="ts" setup>
import { z } from 'zod'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'

const { passwordReset } = useAuth()

const { t } = useLang()
const toast = useToast()

const ZodPasswordReset = z.object({
	email: z.string().email({
		message: t('pages.auth.password.reset.form.email.validation.email')
	})
})

const validationSchema = toTypedSchema(ZodPasswordReset)

const { defineInputBinds, handleSubmit, errors, isSubmitting } = useForm({
	validationSchema
})

const email = defineInputBinds('email')

const onSubmit = handleSubmit(async (values) => {
	const { data, error } = await passwordReset({
		email: values.email
	})
	if (data.value) {
		toast.add({
			title: data.value?.detail ?? t('pages.auth.password.reset.success.title')
		})
	}

	if (error.value) {
		toast.add({
			title: error.value?.message ?? t('pages.auth.password.reset.error.title'),
			color: 'red'
		})
	}
})
</script>

<template>
	<section class="grid">
		<form
			id="resetForm"
			class="container-xxs p-0 md:px-6"
			name="resetForm"
			@submit="onSubmit"
		>
			<div
				class="p-4 md:p-8 flex h-full flex-wrap items-center justify-center lg:justify-between bg-white dark:bg-zinc-800 border border-gray-900/10 dark:border-gray-50/[0.2] rounded-[0.5rem] shadow-[0_4px_9px_-4px_#0000000d] dark:shadow-[0_4px_9px_-4px_#0000000d]"
			>
				<div class="relative grid gap-4 w-full">
					<div class="grid">
						<h3>{{ $t('pages.auth.password.reset.description') }}</h3>
					</div>

					<div class="grid content-evenly items-start">
						<label
							class="text-primary-700 dark:text-primary-100 mb-2 hidden"
							for="email"
							>{{ $t('pages.auth.password.reset.form.email.label') }}</label
						>
						<FormTextInput
							id="email"
							:bind="email"
							class="text-primary-700 dark:text-primary-100 mb-2"
							name="email"
							type="text"
							autocomplete="email"
							:placeholder="$t('pages.auth.password.reset.form.email.placeholder')"
							:required="true"
						/>
						<span v-if="errors.email" class="text-sm text-red-600 px-4 py-3 relative">{{
							errors.email
						}}</span>
					</div>

					<button
						type="submit"
						class="inline-block w-full rounded bg-primary px-7 pb-2.5 pt-3 text-sm font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
						:disabled="isSubmitting"
						:aria-busy="isSubmitting"
					>
						{{ $t('pages.auth.password.reset.form.submit') }}
					</button>
				</div>
			</div>
		</form>
	</section>
</template>
