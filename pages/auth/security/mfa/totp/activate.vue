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
				? '/auth/security/mfa'
				: `/${locale.value}/auth/security/mfa`,
		label: t('seoUi.breadcrumb.items.auth.security.mfa.label'),
		ariaLabel: t('seoUi.breadcrumb.items.auth.security.mfa.ariaLabel')
	},
	{
		to:
			locale.value === config.public.defaultLocale
				? '/auth/security/mfa/totp/activate'
				: `/${locale.value}/auth/security/mfa/totp/activate`,
		label: t('seoUi.breadcrumb.items.auth.security.mfa.totp.activate.label'),
		current: true
	}
])

definePageMeta({
	layout: 'user',
	middleware: ['auth', 'auth-no-totp']
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-12">
		<SBreadcrumb id="sub" :items="items" :ui="breadcrumbUi" />
		<PageTitle
			:text="$t('pages.auth.security.mfa.totp.activate.title')"
			class="capitalize text-center"
		/>
		<PageBody>
			<div
				class="container-xxs p-0 md:px-6 bg-white dark:bg-zinc-800 border border-gray-900/10 dark:border-gray-50/[0.2] rounded p-4"
			>
				<AuthMfaTotpActivate />
				<AuthMfaTotpActivateForm />
			</div>
		</PageBody>
	</PageWrapper>
</template>
