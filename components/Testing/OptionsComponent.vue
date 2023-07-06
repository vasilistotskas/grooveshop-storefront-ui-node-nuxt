<script setup lang="ts">
defineSlots<{
	default(props: {}): any
}>()

withDefaults(defineProps<{ title?: string }>(), { title: 'The original' })

await new Promise((resolve) => setTimeout(resolve, 1))
</script>

<template>
	<h2>{{ title }}</h2>
	<div>
		<slot />
	</div>
</template>
