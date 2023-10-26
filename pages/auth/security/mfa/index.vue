<script lang="ts" setup>
const { t } = useLang()

const { _totpActive } = useAuthSession()
const isTotpActive = _totpActive.get() === 'true'

definePageMeta({
	layout: 'user',
	middleware: 'auth'
})
useServerHead(() => ({
	title: t('pages.auth.security.mfa.title'),
	meta: [
		{
			name: 'description',
			content: t('pages.auth.security.mfa.description')
		}
	]
}))
useServerSeoMeta({
	title: t('pages.auth.security.mfa.title'),
	description: t('pages.auth.security.mfa.description')
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-12">
		<PageTitle
			:text="$t('pages.auth.security.mfa.title')"
			class="capitalize text-center"
		/>
		<IconCarbon:twoFactorAuthentication class="w-24 h-24 mx-auto text-primary-500" />
		<PageBody>
			<div
				class="container-xxs relative grid items-center justify-center justify-items-center gap-4 p-0 md:px-6"
			>
				<template v-if="isTotpActive">
					<AuthMfaTotpDeactivateButton />
					<UButton :to="'/auth/security/mfa/recovery-codes'">
						{{ $t('pages.auth.security.mfa.recovery.codes.link') }}
					</UButton>
					<UButton :to="'/auth/security/mfa/recovery-codes/generate'">
						{{ $t('pages.auth.security.mfa.recovery.codes.generate.link') }}
					</UButton>
				</template>
				<template v-else>
					<UButton :to="'/auth/security/mfa/totp/activate'">
						{{ $t('pages.auth.security.mfa.totp.activate.link') }}
					</UButton>
				</template>
			</div>
		</PageBody>
	</PageWrapper>
</template>
