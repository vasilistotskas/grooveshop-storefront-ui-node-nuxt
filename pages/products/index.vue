<script lang="ts" setup>
const links = useBreadcrumbItems()

definePageMeta({
	layout: 'page'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-4">
		<UBreadcrumb :links="links" />
		<PageBody>
			<ProductsList />
		</PageBody>
	</PageWrapper>
</template>
