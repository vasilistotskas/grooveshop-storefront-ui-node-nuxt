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
	<PageWrapper class="container-fluid flex flex-col">
		<PageBody>
			<div class="container">
				<UBreadcrumb :links="links" class="mb-5 md:pl-[2.6rem]" />
			</div>
			<div class="flex gap-4">
				<ProductsSidebar />
				<ProductsList />
			</div>
		</PageBody>
	</PageWrapper>
</template>
