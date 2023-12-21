<script lang="ts" setup>
const links = useBreadcrumbItems()

definePageMeta({
	layout: 'page'
})
</script>

<template>
	<PageWrapper class="container flex flex-col">
		<UBreadcrumb :links="links" />
		<PageHeader>
			<PageTitle :text="$t('pages.blog.title')" class="capitalize text-center" />
		</PageHeader>
		<PageBody>
			<div></div>
		</PageBody>
	</PageWrapper>
</template>
