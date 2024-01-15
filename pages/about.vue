<script lang="ts" setup>
definePageMeta({
	layout: 'default'
})
</script>

<template>
	<PageWrapper class="container flex flex-col">
		<PageHeader>
			<PageTitle :text="$t('pages.about.title')" class="text-center capitalize" />
		</PageHeader>
		<PageBody>
			<div></div>
		</PageBody>
	</PageWrapper>
</template>
