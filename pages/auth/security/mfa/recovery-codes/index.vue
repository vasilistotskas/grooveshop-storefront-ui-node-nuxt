<script lang="ts" setup>
const links = useBreadcrumbItems()

definePageMeta({
	layout: 'user',
	middleware: ['auth']
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-6 md:gap-12">
		<UBreadcrumb :links="links" />
		<PageTitle
			:text="$t('pages.auth.security.mfa.recovery.codes.title')"
			class="capitalize text-center"
		/>
		<PageBody>
			<AuthMfaRecoveryCodes />
		</PageBody>
	</PageWrapper>
</template>
