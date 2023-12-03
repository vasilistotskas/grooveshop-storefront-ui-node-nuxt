<script lang="ts" setup>
const config = useRuntimeConfig()
const { t, locale } = useLang()
const breadcrumbUi = useBreadcrumbsUi()

definePageMeta({
	layout: 'user',
	middleware: ['auth']
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
				? '/auth/security/mfa'
				: `/${locale.value}/auth/security/mfa`,
		label: t('seoUi.breadcrumb.items.auth.security.mfa.label'),
		ariaLabel: t('seoUi.breadcrumb.items.auth.security.mfa.ariaLabel')
	},
	{
		to:
			locale.value === config.public.defaultLocale
				? '/auth/security/mfa/recovery-codes'
				: `/${locale.value}/auth/security/mfa/recovery-codes`,
		label: t('seoUi.breadcrumb.items.auth.security.mfa.recovery.codes.label'),
		ariaLabel: t('seoUi.breadcrumb.items.auth.security.mfa.recovery.codes.ariaLabel')
	},
	{
		to:
			locale.value === config.public.defaultLocale
				? '/auth/security/mfa/recovery-codes/generate'
				: `/${locale.value}/auth/security/mfa/recovery-codes/generate`,
		label: t('seoUi.breadcrumb.items.auth.security.mfa.recovery.codes.generate.label'),
		current: true
	}
])
</script>

<template>
	<PageWrapper class="container flex flex-col gap-12">
		<SBreadcrumb id="sub" :items="items" :ui="breadcrumbUi" />
		<PageTitle
			:text="$t('pages.auth.security.mfa.recovery.codes.generate.title')"
			class="capitalize text-center"
		/>
		<PageBody>
			<AuthMfaRecoveryCodesGenerate />
		</PageBody>
	</PageWrapper>
</template>
