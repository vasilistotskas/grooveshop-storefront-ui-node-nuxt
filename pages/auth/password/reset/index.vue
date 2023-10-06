<script lang="ts" setup>
const { t } = useLang()
const route = useRoute()

definePageMeta({
	layout: 'page',
	middleware: 'guest'
})
useServerHead(() => ({
	title: t('pages.auth.password.reset.title'),
	meta: [
		{
			name: 'description',
			content: t('pages.auth.password.reset.description')
		},
		{
			name: 'keywords',
			content: t('pages.auth.password.reset.keywords')
		}
	]
}))
useServerSeoMeta({
	title: t('pages.auth.password.reset.title'),
	description: t('pages.auth.password.reset.description'),
	ogTitle: t('pages.auth.password.reset.title'),
	ogDescription: t('pages.auth.password.reset.description'),
	ogImage: '',
	ogUrl: route.path,
	twitterTitle: t('pages.auth.password.reset.title'),
	twitterDescription: t('pages.auth.password.reset.description'),
	twitterImage: ''
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-12">
		<PageTitle
			:text="`${$t('pages.auth.password.reset.title')}`"
			class="capitalize text-center"
		/>
		<PageBody>
			<AuthPasswordResetForm />
		</PageBody>
	</PageWrapper>
</template>
