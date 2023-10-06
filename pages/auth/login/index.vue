<script lang="ts" setup>
const { t } = useLang()
const route = useRoute()

definePageMeta({
	layout: 'page',
	middleware: 'guest'
})
useServerHead(() => ({
	title: t('pages.auth.login.title'),
	meta: [
		{
			name: 'description',
			content: t('pages.auth.login.description')
		},
		{
			name: 'keywords',
			content: t('pages.auth.login.keywords')
		}
	]
}))
useServerSeoMeta({
	title: t('pages.auth.login.title'),
	description: t('pages.auth.login.description'),
	ogTitle: t('pages.auth.login.title'),
	ogDescription: t('pages.auth.login.description'),
	ogImage: '',
	ogUrl: route.path,
	twitterTitle: t('pages.auth.login.title'),
	twitterDescription: t('pages.auth.login.description'),
	twitterImage: ''
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-12">
		<PageTitle :text="`${$t('pages.auth.login.title')}`" class="capitalize text-center" />
		<PageBody>
			<AuthLoginForm />
		</PageBody>
	</PageWrapper>
</template>
