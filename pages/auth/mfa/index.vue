<script lang="ts" setup>
const { t } = useLang()
const route = useRoute()

const { _totpActive } = useAuthSession()
const isTotpActive = _totpActive.get()

definePageMeta({
	layout: 'page',
	middleware: 'auth'
})
useServerHead(() => ({
	title: t('pages.auth.mfa.title'),
	meta: [
		{
			name: 'description',
			content: t('pages.auth.mfa.description')
		},
		{
			name: 'keywords',
			content: t('pages.auth.mfa.keywords')
		}
	]
}))
useServerSeoMeta({
	title: t('pages.auth.mfa.title'),
	description: t('pages.auth.mfa.description'),
	ogTitle: t('pages.auth.mfa.title'),
	ogDescription: t('pages.auth.mfa.description'),
	ogImage: '',
	ogUrl: route.path,
	twitterTitle: t('pages.auth.mfa.title'),
	twitterDescription: t('pages.auth.mfa.description'),
	twitterImage: ''
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-12">
		<PageTitle :text="$t('pages.auth.mfa.title')" class="capitalize text-center" />
		<IconCarbon:twoFactorAuthentication class="w-24 h-24 mx-auto text-primary-500" />
		<PageBody>
			<div
				class="container-xxs relative grid items-center justify-center justify-items-center gap-4 p-0 md:px-6"
			>
				<template v-if="isTotpActive">
					<AuthMfaTotpDeactivateButton />
					<UButton :to="'/auth/mfa/recovery-codes'">
						{{ $t('pages.auth.mfa.recovery.codes.link') }}
					</UButton>
					<UButton :to="'/auth/mfa/recovery-codes/generate'">
						{{ $t('pages.auth.mfa.recovery.codes.generate.link') }}
					</UButton>
				</template>
				<template v-else>
					<UButton :to="'/auth/mfa/totp/activate'">
						{{ $t('pages.auth.mfa.totp.activate.link') }}
					</UButton>
				</template>
			</div>
		</PageBody>
	</PageWrapper>
</template>
