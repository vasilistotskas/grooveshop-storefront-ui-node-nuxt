<script lang="ts" setup>
definePageMeta({
	layout: 'user',
	middleware: ['auth']
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4 md:gap-8">
		<PageTitle
			:text="$t('pages.auth.security.mfa.recovery.codes.title')"
			class="text-center capitalize"
		/>
		<AuthSecurityNavbar />
		<PageBody>
			<AuthMfaRecoveryCodes />
		</PageBody>
	</PageWrapper>
</template>
