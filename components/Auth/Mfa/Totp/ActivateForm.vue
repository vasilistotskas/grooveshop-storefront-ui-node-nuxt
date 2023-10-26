<script lang="ts" setup>
import { z } from 'zod'
import type { MfaTotpActivatePostBody } from '~/types/auth'

const { totpActivatePost } = useAuthMfa()

const toast = useToast()
const { t } = useLang()

async function onSubmit(values: MfaTotpActivatePostBody) {
	const { data, error } = await totpActivatePost(values)
	if (data.value?.success) {
		toast.add({
			title: t('pages.auth.auth.mfa.totp.activate.success'),
			color: 'green'
		})
	} else if (error.value) {
		toast.add({
			title: t('pages.auth.auth.mfa.totp.activate.error'),
			color: 'red'
		})
		clearNuxtData('totpActivatePost')
	}
}

const formSchema = {
	fields: [
		{
			label: t('pages.auth.auth.mfa.totp.activate.form.code.label'),
			name: 'code',
			as: 'input',
			rules: z.string().min(6).max(6),
			autocomplete: 'one-time-code',
			readonly: false
		}
	]
}
</script>

<template>
	<section class="grid items-center justify-center justify-items-center">
		<DynamicForm :schema="formSchema" @submit="onSubmit" />
	</section>
</template>
