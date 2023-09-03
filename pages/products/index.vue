<script lang="ts" setup>
const { t } = useLang()
const config = useRuntimeConfig()
const route = useRoute('products___en')

definePageMeta({
	layout: 'page'
})
useServerHead(() => ({
	title: t('pages.products.title'),
	meta: [
		{
			name: 'description',
			content: t('pages.products.description')
		},
		{
			name: 'keywords',
			content: t('pages.products.keywords')
		}
	]
}))
useServerSeoMeta({
	title: t('pages.products.title'),
	description: t('pages.products.description'),
	ogTitle: t('pages.products.title'),
	ogDescription: t('pages.products.description'),
	ogImage: '',
	ogUrl: config.public.baseUrl + route.path,
	twitterTitle: t('pages.products.title'),
	twitterDescription: t('pages.products.description'),
	twitterImage: ''
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4 mt-4">
		<PageTitle :text="`${$t('pages.products.title')}`" class="capitalize" />
		<PageBody>
			<ProductsList />
		</PageBody>
	</PageWrapper>
</template>
