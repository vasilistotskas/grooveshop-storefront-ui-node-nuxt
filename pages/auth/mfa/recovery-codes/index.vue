<script lang="ts" setup>
const { t } = useLang()
const route = useRoute()

definePageMeta({
	layout: 'page',
	middleware: ['auth']
})
useServerHead(() => ({
	title: t('pages.auth.mfa.recovery.codes.title'),
	meta: [
		{
			name: 'description',
			content: t('pages.auth.mfa.recovery.codes.description')
		},
		{
			name: 'keywords',
			content: t('pages.auth.mfa.recovery.codes.keywords')
		}
	]
}))
useServerSeoMeta({
	title: t('pages.auth.mfa.recovery.codes.title'),
	description: t('pages.auth.mfa.recovery.codes.description'),
	ogTitle: t('pages.auth.mfa.recovery.codes.title'),
	ogDescription: t('pages.auth.mfa.recovery.codes.description'),
	ogImage: '',
	ogUrl: route.path,
	twitterTitle: t('pages.auth.mfa.recovery.codes.title'),
	twitterDescription: t('pages.auth.mfa.recovery.codes.description'),
	twitterImage: ''
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-12">
		<PageTitle
			:text="$t('pages.auth.mfa.recovery.codes.title')"
			class="capitalize text-center"
		/>
		<PageBody>
			<AuthMfaRecoveryCodes />
		</PageBody>
	</PageWrapper>
</template>
