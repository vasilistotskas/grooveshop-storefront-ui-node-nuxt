<script lang="ts" setup>
definePageMeta({
	layout: 'testing'
})
await new Promise((resolve) => setTimeout(resolve, 1))
</script>

<template>
	<LazyTestingSomeComponent />
	<TestingGlobalComponent />
	<NuxtPage />
</template>
