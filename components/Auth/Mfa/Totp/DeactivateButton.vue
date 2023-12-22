<script lang="ts" setup>
const { totpDeactivate } = useAuthMfa()

const toast = useToast()
const { t } = useI18n()

async function onSubmit() {
	const { data, error } = await totpDeactivate({})
	if (data.value?.success) {
		toast.add({
			title: t('pages.auth.security.mfa.totp.deactivate.success'),
			color: 'green'
		})
	} else if (error.value) {
		toast.add({
			title: t('pages.auth.security.mfa.totp.deactivate.error'),
			color: 'red'
		})
		clearNuxtData('totpDeactivate')
	}
}
</script>

<template>
	<section class="grid items-center">
		<UButton @click="onSubmit">
			{{ $t('pages.auth.security.mfa.totp.deactivate.button') }}
		</UButton>
	</section>
</template>
