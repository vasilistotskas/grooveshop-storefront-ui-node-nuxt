<script lang="ts" setup>
const { t } = useLang()
const route = useRoute('auth-password-reset-confirm-uid-token___en')

definePageMeta({
	layout: 'page',
	middleware: 'guest'
})
useServerHead(() => ({
	title: t('pages.auth.password.reset.confirm.title'),
	meta: [
		{
			name: 'description',
			content: t('pages.auth.password.reset.confirm.description')
		},
		{
			name: 'keywords',
			content: t('pages.auth.password.reset.confirm.keywords')
		}
	]
}))
useServerSeoMeta({
	title: t('pages.auth.password.reset.confirm.title'),
	description: t('pages.auth.password.reset.confirm.description'),
	ogTitle: t('pages.auth.password.reset.confirm.title'),
	ogDescription: t('pages.auth.password.reset.confirm.description'),
	ogImage: '',
	ogUrl: route.path,
	twitterTitle: t('pages.auth.password.reset.confirm.title'),
	twitterDescription: t('pages.auth.password.reset.confirm.description'),
	twitterImage: ''
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-12">
		<PageTitle
			:text="`${$t('pages.auth.password.reset.confirm.title')}`"
			class="capitalize text-center"
		/>
		<PageBody>
			<AuthPasswordResetConfirmForm />
		</PageBody>
	</PageWrapper>
</template>
