<script setup lang="ts">
defineSlots<{
	default(props: {}): any
}>()
defineProps({
	mainClass: {
		type: String,
		default: 'relative flex-1 flex flex-col w-full h-full'
	}
})
</script>

<template>
	<main :class="mainClass">
		<slot />
	</main>
</template>
