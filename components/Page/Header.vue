<script setup lang="ts">
defineSlots<{
	default(props: {}): any
}>()
</script>

<template>
	<header class="relative z-20">
		<slot />
	</header>
</template>
