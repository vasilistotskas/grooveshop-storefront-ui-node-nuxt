<script lang="ts" setup>
defineSlots<{
	default(props: {}): any
}>()
</script>

<template>
	<div
		class="supports-backdrop-blur:bg-white/60 overflow-y-auto rounded bg-zinc-100/[0.8] p-4 backdrop-blur dark:bg-zinc-800/[0.8]"
	>
		<slot />
	</div>
</template>
