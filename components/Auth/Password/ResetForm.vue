<script lang="ts" setup>
import { z } from 'zod'
import type { PasswordResetBody } from '~/types/auth'
import type { DynamicFormSchema } from '~/types/form'

const { passwordReset } = useAuth()

const { t } = useI18n()
const toast = useToast()

async function onSubmit(values: PasswordResetBody) {
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
}

const formSchema: DynamicFormSchema = {
	fields: [
		{
			label: t('pages.auth.password.reset.form.email.label'),
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
</script>

<template>
	<section class="grid">
		<DynamicForm :schema="formSchema" @submit="onSubmit" />
	</section>
</template>
