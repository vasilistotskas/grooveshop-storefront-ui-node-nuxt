<script lang="ts" setup>
const config = useRuntimeConfig()
const { t, locale } = useLang()
const breadcrumbUi = useBreadcrumbsUi()

definePageMeta({
	layout: 'user',
	middleware: 'auth'
})

const items = defineBreadcrumbItems([
	{
		to: '/',
		ariaLabel: t('seoUi.breadcrumb.items.index.ariaLabel'),
		icon: 'material-symbols:home-outline-rounded'
	},
	{
		to:
			locale.value === config.public.defaultLocale
				? '/auth/security'
				: `/${locale.value}/auth/security`,
		label: t('seoUi.breadcrumb.items.auth.security.general.label'),
		current: true
	}
])
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4">
		<SBreadcrumb id="sub" :items="items" :ui="breadcrumbUi" />
		<PageHeader class="pb-4">
			<PageTitle :text="$t('pages.auth.security.general.title')" />
		</PageHeader>
		<PageBody> </PageBody>
	</PageWrapper>
</template>
