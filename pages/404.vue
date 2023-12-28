<script lang="ts" setup>
definePageMeta({
	layout: 'default'
})
</script>

<template>
	<PageWrapper class="flex flex-col items-center justify-center">
		<Error :code="404" />
	</PageWrapper>
</template>
