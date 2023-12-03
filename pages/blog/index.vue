<script lang="ts" setup>
definePageMeta({
	layout: 'page'
})

const config = useRuntimeConfig()
const { t, locale } = useLang()

const items = defineBreadcrumbItems([
	{
		to: '/',
		ariaLabel: t('seoUi.breadcrumb.items.index.ariaLabel'),
		icon: 'material-symbols:home-outline-rounded'
	},
	{
		to: locale.value === config.public.defaultLocale ? '/blog' : `/${locale.value}/blog`,
		label: t('seoUi.breadcrumb.items.blog.label'),
		current: true
	}
])
const breadcrumbUi = useBreadcrumbsUi()
</script>

<template>
	<PageWrapper class="container flex flex-col">
		<SBreadcrumb id="sub" :items="items" :ui="breadcrumbUi" />
		<PageHeader>
			<PageTitle :text="$t('pages.blog.title')" class="capitalize text-center" />
		</PageHeader>
		<PageBody>
			<div></div>
		</PageBody>
	</PageWrapper>
</template>
