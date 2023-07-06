<script setup lang="ts">
defineSlots<{
	default(props: {}): any
}>()
</script>

<template>
	<main>
		<div class="flex flex-col min-h-screen">
			<div class="flex-1 w-full flex flex-col">
				<slot />
			</div>
		</div>
	</main>
</template>
