<script lang="ts" setup>
definePageMeta({
	layout: 'user',
	middleware: 'auth'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4">
		<PageHeader class="pb-4">
			<PageTitle :text="$t('pages.auth.security.title')" />
		</PageHeader>
		<AuthSecurityNavbar />
		<PageBody> </PageBody>
	</PageWrapper>
</template>
