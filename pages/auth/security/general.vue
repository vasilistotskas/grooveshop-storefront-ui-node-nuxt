<script lang="ts" setup>
definePageMeta({
	layout: 'user',
	middleware: 'auth'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4">
		<PageHeader class="pb-4">
			<PageTitle :text="$t('pages.auth.security.general.title')" />
		</PageHeader>
		<PageBody> </PageBody>
	</PageWrapper>
</template>
