<script lang="ts" setup>
const { t } = useLang()
const route = useRoute()

definePageMeta({
	layout: 'page',
	middleware: ['auth', 'auth-no-totp']
})
useServerHead(() => ({
	title: t('pages.auth.mfa.totp.activate.title'),
	meta: [
		{
			name: 'description',
			content: t('pages.auth.mfa.totp.activate.description')
		},
		{
			name: 'keywords',
			content: t('pages.auth.mfa.totp.activate.keywords')
		}
	]
}))
useServerSeoMeta({
	title: t('pages.auth.mfa.totp.activate.title'),
	description: t('pages.auth.mfa.totp.activate.description'),
	ogTitle: t('pages.auth.mfa.totp.activate.title'),
	ogDescription: t('pages.auth.mfa.totp.activate.description'),
	ogImage: '',
	ogUrl: route.path,
	twitterTitle: t('pages.auth.mfa.totp.activate.title'),
	twitterDescription: t('pages.auth.mfa.totp.activate.description'),
	twitterImage: ''
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-12">
		<PageTitle
			:text="$t('pages.auth.mfa.totp.activate.title')"
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
