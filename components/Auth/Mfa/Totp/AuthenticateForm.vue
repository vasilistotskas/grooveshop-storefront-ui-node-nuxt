<script lang="ts" setup>
import { z } from 'zod'
import type { MfaTotpAuthenticateBody } from '~/types/auth'

const { totpAuthenticate } = useAuthMfa()

const { t } = useLang()

async function onSubmit(values: MfaTotpAuthenticateBody) {
	await totpAuthenticate(values)
}

const formSchema = {
	fields: [
		{
			label: t('pages.auth.security.mfa.totp.authenticate.form.code.label'),
			name: 'code',
			as: 'input',
			rules: z.string().min(6),
			autocomplete: 'one-time-code',
			readonly: false
		}
	]
}
</script>

<template>
	<div class="container-xxs p-0 md:px-6">
		<section class="grid items-center">
			<DynamicForm :schema="formSchema" @submit="onSubmit" />
		</section>
	</div>
</template>
