<script lang="ts" setup>
definePageMeta({
	layout: 'user',
	middleware: 'auth'
})
</script>

<template>
	<PageWrapper>
		<PageHeader />
		<PageBody />
	</PageWrapper>
</template>
