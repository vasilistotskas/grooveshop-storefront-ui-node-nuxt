<script lang="ts" setup>
const { t } = useLang()
const breadcrumbUi = useBreadcrumbsUi()

const items = defineBreadcrumbItems([
	{
		to: '/',
		ariaLabel: t('seoUi.breadcrumb.items.index.ariaLabel'),
		icon: 'material-symbols:home-outline-rounded'
	},
	{ to: '/products', label: t('seoUi.breadcrumb.items.products.label'), current: true }
])

definePageMeta({
	layout: 'page'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4">
		<SBreadcrumb id="sub" :items="items" :ui="breadcrumbUi" />
		<PageBody>
			<ProductsList />
		</PageBody>
	</PageWrapper>
</template>
