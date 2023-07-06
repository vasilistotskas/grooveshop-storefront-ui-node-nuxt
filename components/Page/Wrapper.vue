<script setup lang="ts">
defineSlots<{
	default(props: {}): any
}>()
</script>

<template>
	<div class="wrapper relative">
		<slot />
	</div>
</template>
