<script lang="ts" setup>
const { recoveryCodesGenerate } = useAuthMfa()

const router = useRouter()
const toast = useToast()
const { t } = useLang()

async function onSubmit() {
	const { data, error } = await recoveryCodesGenerate({})
	if (data.value?.codes) {
		toast.add({
			title: t('pages.auth.mfa.recovery.codes.generate.success'),
			color: 'green'
		})
		router.push('/auth/mfa/recovery-codes')
	} else if (error.value) {
		toast.add({
			title: t('pages.auth.mfa.recovery.codes.generate.error'),
			color: 'red'
		})
	}
}
</script>

<template>
	<div class="container-xxs p-0 md:px-6">
		<section class="grid items-center justify-center justify-items-center">
			<UButton
				:label="$t('pages.auth.mfa.recovery.codes.generate.form.button')"
				size="xl"
				@click="onSubmit"
			/>
		</section>
	</div>
</template>
