<script lang="ts" setup>
const { t } = useLang()
const route = useRoute()

definePageMeta({
	layout: 'page',
	middleware: 'guest'
})
useServerHead(() => ({
	title: t('pages.auth.registration.title'),
	meta: [
		{
			name: 'description',
			content: t('pages.auth.registration.description')
		},
		{
			name: 'keywords',
			content: t('pages.auth.registration.keywords')
		}
	]
}))
useServerSeoMeta({
	title: t('pages.auth.registration.title'),
	description: t('pages.auth.registration.description'),
	ogTitle: t('pages.auth.registration.title'),
	ogDescription: t('pages.auth.registration.description'),
	ogImage: '',
	ogUrl: route.path,
	twitterTitle: t('pages.auth.registration.title'),
	twitterDescription: t('pages.auth.registration.description'),
	twitterImage: ''
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-12">
		<PageTitle
			:text="$t('pages.auth.registration.title')"
			class="capitalize text-center"
		/>
		<PageBody>
			<AuthRegistrationForm />
		</PageBody>
	</PageWrapper>
</template>
