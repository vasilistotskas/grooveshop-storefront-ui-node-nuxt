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
			locale.value === config.public.defaultLocale
				? '/auth/password/reset'
				: `/${locale.value}/auth/password/reset`,
		label: t('seoUi.breadcrumb.items.auth.password.reset.label'),
		current: true
	}
])

definePageMeta({
	layout: 'page',
	middleware: 'guest'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-6 md:gap-12">
		<SBreadcrumb id="sub" :items="items" :ui="breadcrumbUi" />
		<PageTitle
			:text="$t('pages.auth.password.reset.title')"
			class="capitalize text-center"
		/>
		<PageBody>
			<AuthPasswordResetForm />
		</PageBody>
	</PageWrapper>
</template>
