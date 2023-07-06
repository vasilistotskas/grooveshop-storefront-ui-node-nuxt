<template>
	<LazyTestingSomeComponent />
	<TestingGlobalComponent />
	<NuxtPage />
</template>

<script setup>
await new Promise((resolve) => setTimeout(resolve, 1))
useHead({
	title: 'My App'
})
</script>
