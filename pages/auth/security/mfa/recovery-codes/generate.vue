<script lang="ts" setup>
const { t } = useLang()
const route = useRoute()

definePageMeta({
	layout: 'user',
	middleware: ['auth']
})
useServerHead(() => ({
	title: t('pages.auth.security.mfa.recovery.codes.generate.title'),
	meta: [
		{
			name: 'description',
			content: t('pages.auth.security.mfa.recovery.codes.generate.description')
		},
		{
			name: 'keywords',
			content: t('pages.auth.security.mfa.recovery.codes.generate.keywords')
		}
	]
}))
useServerSeoMeta({
	title: t('pages.auth.security.mfa.recovery.codes.generate.title'),
	description: t('pages.auth.security.mfa.recovery.codes.generate.description'),
	ogTitle: t('pages.auth.security.mfa.recovery.codes.generate.title'),
	ogDescription: t('pages.auth.security.mfa.recovery.codes.generate.description'),
	ogImage: '',
	ogUrl: route.path,
	twitterTitle: t('pages.auth.security.mfa.recovery.codes.generate.title'),
	twitterDescription: t('pages.auth.security.mfa.recovery.codes.generate.description'),
	twitterImage: ''
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-12">
		<PageTitle
			:text="$t('pages.auth.security.mfa.recovery.codes.generate.title')"
			class="capitalize text-center"
		/>
		<PageBody>
			<AuthMfaRecoveryCodesGenerate />
		</PageBody>
	</PageWrapper>
</template>
