<script lang="ts" setup>
const config = useRuntimeConfig()
const { t, locale } = useI18n()

const links = [
	{
		to: locale.value === config.public.defaultLocale ? '/' : `/${locale.value}`,
		label: t('breadcrumb.items.index.label'),
		icon: 'i-heroicons-home'
	},
	{
		to:
			locale.value === config.public.defaultLocale
				? '/products'
				: `/${locale.value}/products`,
		label: t('breadcrumb.items.products.label'),
		current: true
	}
]

definePageMeta({
	layout: 'default'
})
</script>

<template>
	<PageWrapper class="container flex flex-col">
		<PageBody>
			<UBreadcrumb :links="links" class="mb-5 pl-4" />
			<ProductsList />
		</PageBody>
	</PageWrapper>
</template>
