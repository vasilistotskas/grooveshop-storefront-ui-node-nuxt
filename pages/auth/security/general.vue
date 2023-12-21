<script lang="ts" setup>
const links = useBreadcrumbItems()

definePageMeta({
	layout: 'user',
	middleware: 'auth'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4">
		<UBreadcrumb :links="links" />
		<PageHeader class="pb-4">
			<PageTitle :text="$t('pages.auth.security.general.title')" />
		</PageHeader>
		<PageBody> </PageBody>
	</PageWrapper>
</template>
