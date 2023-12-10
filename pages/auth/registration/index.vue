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
				? '/auth/registration'
				: `/${locale.value}/auth/registration`,
		label: t('seoUi.breadcrumb.items.auth.registration.label'),
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
			:text="$t('pages.auth.registration.title')"
			class="capitalize text-center"
		/>
		<PageBody>
			<AuthRegistrationForm />
		</PageBody>
	</PageWrapper>
</template>
