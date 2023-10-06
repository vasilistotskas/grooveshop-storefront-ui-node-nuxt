<script lang="ts" setup>
defineSlots<{
	default(props: {}): any
}>()
</script>

<template>
	<div class="wrapper relative mt-12 mb-12 min-h-[calc(100vh-33rem)]">
		<slot />
	</div>
</template>
