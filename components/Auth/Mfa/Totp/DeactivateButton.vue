<script lang="ts" setup>
const { totpDeactivate } = useAuthMfa()

const toast = useToast()
const { t } = useLang()

async function onSubmit() {
	const { data, error } = await totpDeactivate({})
	if (data.value?.success) {
		toast.add({
			title: t('pages.auth.mfa.totp.deactivate.success'),
			color: 'green'
		})
	} else if (error.value) {
		toast.add({
			title: t('pages.auth.mfa.totp.deactivate.error'),
			color: 'red'
		})
		clearNuxtData('totpDeactivate')
	}
}
</script>

<template>
	<section class="grid items-center">
		<UButton @click="onSubmit">
			{{ $t('pages.auth.mfa.totp.deactivate.button') }}
		</UButton>
	</section>
</template>
