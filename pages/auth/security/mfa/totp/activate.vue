<script lang="ts" setup>
definePageMeta({
	layout: 'user',
	middleware: ['auth', 'auth-no-totp']
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-6 md:gap-12">
		<PageTitle
			:text="$t('pages.auth.security.mfa.totp.activate.title')"
			class="capitalize"
		/>
		<AuthSecurityNavbar />
		<PageBody>
			<div
				class="container-xxs rounded border border-gray-900/10 bg-white p-0 p-4 dark:border-gray-50/[0.2] dark:bg-zinc-800 md:px-6"
			>
				<AuthMfaTotpActivate />
				<AuthMfaTotpActivateForm />
			</div>
		</PageBody>
	</PageWrapper>
</template>
