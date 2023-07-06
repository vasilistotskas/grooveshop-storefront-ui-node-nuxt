<script setup lang="ts">
defineSlots<{
	default(props: {}): any
}>()
</script>

<template>
	<div class="loading-wrapper grid grid-rows-auto-1fr gap-4 relative">
		<slot />
	</div>
</template>
