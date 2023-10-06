<script lang="ts" setup>
defineSlots<{
	default(props: {}): any
}>()
</script>

<template>
	<div
		class="bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8] backdrop-blur supports-backdrop-blur:bg-white/60 p-4 rounded overflow-y-auto"
	>
		<slot />
	</div>
</template>
