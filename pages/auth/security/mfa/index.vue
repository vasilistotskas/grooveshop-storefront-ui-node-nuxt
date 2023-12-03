<script lang="ts" setup>
const config = useRuntimeConfig()
const { t, locale } = useLang()
const breadcrumbUi = useBreadcrumbsUi()
const { _totpActive } = useAuthSession()

const isTotpActive = _totpActive.get()

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
		label: t('seoUi.breadcrumb.items.auth.security.label'),
		ariaLabel: t('seoUi.breadcrumb.items.auth.security.ariaLabel')
	},
	{
		to:
			locale.value === config.public.defaultLocale
				? '/auth/security/mfa'
				: `/${locale.value}/auth/security/mfa`,
		label: t('seoUi.breadcrumb.items.auth.security.mfa.label'),
		current: true
	}
])

definePageMeta({
	layout: 'user',
	middleware: 'auth'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-12">
		<SBreadcrumb id="sub" :items="items" :ui="breadcrumbUi" />
		<PageTitle
			:text="$t('pages.auth.security.mfa.title')"
			class="capitalize text-center"
		/>
		<IconCarbon:twoFactorAuthentication class="w-24 h-24 mx-auto text-primary-500" />
		<PageBody>
			<div
				class="container-xxs relative grid items-center justify-center justify-items-center gap-4 p-0 md:px-6"
			>
				<template v-if="isTotpActive">
					<AuthMfaTotpDeactivateButton />
					<UButton :to="'/auth/security/mfa/recovery-codes'">
						{{ $t('pages.auth.security.mfa.recovery.codes.link') }}
					</UButton>
					<UButton :to="'/auth/security/mfa/recovery-codes/generate'">
						{{ $t('pages.auth.security.mfa.recovery.codes.generate.link') }}
					</UButton>
				</template>
				<template v-else>
					<UButton :to="'/auth/security/mfa/totp/activate'">
						{{ $t('pages.auth.security.mfa.totp.activate.link') }}
					</UButton>
				</template>
			</div>
		</PageBody>
	</PageWrapper>
</template>
