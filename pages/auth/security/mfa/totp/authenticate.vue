<script lang="ts" setup>
definePageMeta({
	layout: 'user',
	middleware: ['auth', 'auth-totp-active']
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-6 md:gap-12">
		<PageTitle
			:text="$t('pages.auth.security.mfa.totp.authenticate.title')"
			class="capitalize text-center"
		/>
		<PageBody>
			<AuthMfaTotpAuthenticateForm />
		</PageBody>
	</PageWrapper>
</template>
