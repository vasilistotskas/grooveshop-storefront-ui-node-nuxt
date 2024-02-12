<script lang="ts" setup>
definePageMeta({
	layout: 'user',
	middleware: ['auth', 'auth-totp-active']
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4 md:gap-8">
		<PageTitle
			:text="$t('pages.auth.security.mfa.totp.authenticate.title')"
			class="text-center capitalize"
		/>
		<AuthSecurityNavbar />
		<PageBody>
			<AuthMfaTotpAuthenticateForm />
		</PageBody>
	</PageWrapper>
</template>
