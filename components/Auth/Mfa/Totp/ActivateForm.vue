<script lang="ts" setup>
import { z } from 'zod'
import type { MfaTotpActivatePostBody } from '~/types/auth'
import type { DynamicFormSchema } from '~/types/form'

const { totpActivatePost } = useAuthMfa()

const toast = useToast()
const { t } = useI18n()

async function onSubmit(values: MfaTotpActivatePostBody) {
	const { data, error } = await totpActivatePost(values)
	if (data.value?.success) {
		toast.add({
			title: t('pages.auth.security.mfa.totp.activate.success'),
			color: 'green'
		})
	} else if (error.value) {
		toast.add({
			title: t('pages.auth.security.mfa.totp.activate.error'),
			color: 'red'
		})
		clearNuxtData('totpActivatePost')
	}
}

const formSchema: DynamicFormSchema = {
	fields: [
		{
			label: t('pages.auth.security.mfa.totp.activate.form.code.label'),
			name: 'code',
			as: 'input',
			rules: z.string().min(6).max(6),
			autocomplete: 'one-time-code',
			readonly: false,
			required: true,
			placeholder: '123456',
			type: 'text'
		}
	]
}
</script>

<template>
	<section class="grid items-center justify-center justify-items-center">
		<DynamicForm :schema="formSchema" @submit="onSubmit" />
	</section>
</template>
