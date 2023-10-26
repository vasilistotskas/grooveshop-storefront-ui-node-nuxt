<script lang="ts" setup>
const { t } = useLang()
const route = useRoute()

definePageMeta({
	layout: 'user',
	middleware: ['auth', 'auth-totp-active']
})

useServerHead(() => ({
	title: t('pages.auth.security.mfa.totp.authenticate.title'),
	meta: [
		{
			name: 'description',
			content: t('pages.auth.security.mfa.totp.authenticate.description')
		},
		{
			name: 'keywords',
			content: t('pages.auth.security.mfa.totp.authenticate.keywords')
		}
	]
}))
useServerSeoMeta({
	title: t('pages.auth.security.mfa.totp.authenticate.title'),
	description: t('pages.auth.security.mfa.totp.authenticate.description'),
	ogTitle: t('pages.auth.security.mfa.totp.authenticate.title'),
	ogDescription: t('pages.auth.security.mfa.totp.authenticate.description'),
	ogImage: '',
	ogUrl: route.path,
	twitterTitle: t('pages.auth.security.mfa.totp.authenticate.title'),
	twitterDescription: t('pages.auth.security.mfa.totp.authenticate.description'),
	twitterImage: ''
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-12">
		<PageTitle
			:text="$t('pages.auth.security.mfa.totp.authenticate.title')"
			class="capitalize text-center"
		/>
		<PageBody>
			<AuthMfaTotpAuthenticateForm />
		</PageBody>
	</PageWrapper>
</template>
