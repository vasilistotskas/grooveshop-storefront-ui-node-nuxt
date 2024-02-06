<script lang="ts" setup>
const { recoveryCodesGenerate } = useAuthMfa()

const router = useRouter()
const toast = useToast()
const { t } = useI18n()

async function onSubmit() {
	const { data, error } = await recoveryCodesGenerate({})
	if (data.value?.codes) {
		toast.add({
			title: t('pages.auth.security.mfa.recovery.codes.generate.success'),
			color: 'green'
		})
		await router.push('/auth/security/mfa/recovery-codes')
	} else if (error.value) {
		toast.add({
			title: t('pages.auth.security.mfa.recovery.codes.generate.error'),
			color: 'red'
		})
		clearNuxtData('recoveryCodesGenerate')
	}
}
</script>

<template>
	<div class="container-xxs p-0 md:px-6">
		<section class="grid items-center justify-center justify-items-center">
			<UButton
				:label="$t('pages.auth.security.mfa.recovery.codes.generate.form.button')"
				size="xl"
				color="white"
				@click="onSubmit"
			/>
		</section>
	</div>
</template>
