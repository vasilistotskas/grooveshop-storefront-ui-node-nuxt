<script lang="ts" setup>
definePageMeta({
	layout: 'user',
	middleware: ['auth']
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-6 md:gap-12">
		<PageTitle
			:text="$t('pages.auth.security.mfa.recovery.codes.generate.title')"
			class="text-center capitalize"
		/>
		<PageBody>
			<AuthMfaRecoveryCodesGenerate />
		</PageBody>
	</PageWrapper>
</template>
