<script setup lang="ts">
defineSlots<{
	default(props: {}): any
}>()
</script>

<template>
	<div class="card-content px-6 py-6 relative">
		<slot />
	</div>
</template>
