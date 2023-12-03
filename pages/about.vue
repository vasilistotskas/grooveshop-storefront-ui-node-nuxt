<script lang="ts" setup>
const config = useRuntimeConfig()
const { t, locale } = useLang()
const breadcrumbUi = useBreadcrumbsUi()

const items = defineBreadcrumbItems([
	{
		to: '/',
		ariaLabel: t('seoUi.breadcrumb.items.index.ariaLabel'),
		icon: 'material-symbols:home-outline-rounded'
	},
	{
		to:
			locale.value === config.public.defaultLocale ? '/about' : `/${locale.value}/about`,
		label: t('seoUi.breadcrumb.items.about.label'),
		current: true
	}
])

definePageMeta({
	layout: 'page'
})
</script>

<template>
	<PageWrapper class="container flex flex-col">
		<SBreadcrumb id="sub" :items="items" :ui="breadcrumbUi" />
		<PageHeader>
			<PageTitle :text="$t('pages.about.title')" class="capitalize text-center" />
		</PageHeader>
		<PageBody>
			<div></div>
		</PageBody>
	</PageWrapper>
</template>
