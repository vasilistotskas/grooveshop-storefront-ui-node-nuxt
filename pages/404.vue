<script lang="ts" setup>
definePageMeta({
	layout: 'page'
})
</script>

<template>
	<PageWrapper class="flex flex-col items-center justify-center">
		<Error :code="404" />
	</PageWrapper>
</template>
