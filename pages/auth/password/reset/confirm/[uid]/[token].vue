<script lang="ts" setup>
const config = useRuntimeConfig()
const { t, locale } = useLang()
const breadcrumbUi = useBreadcrumbsUi()
const route = useRoute('auth-password-reset-confirm-uid-token___en')

const items = defineBreadcrumbItems([
	{
		to: '/',
		ariaLabel: t('seoUi.breadcrumb.items.index.ariaLabel'),
		icon: 'material-symbols:home-outline-rounded'
	},
	{
		to:
			locale.value === config.public.defaultLocale
				? `/auth/password/reset/confirm/${route.params.uid}/${route.params.token}`
				: `/${locale.value}/auth/password/reset/confirm/${route.params.uid}/${route.params.token}`,
		label: t('seoUi.breadcrumb.items.auth.password.reset.confirm.label'),
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
			:text="$t('pages.auth.password.reset.confirm.title')"
			class="capitalize text-center"
		/>
		<PageBody>
			<AuthPasswordResetConfirmForm />
		</PageBody>
	</PageWrapper>
</template>
