<script lang="ts" setup>
defineProps({
	text: {
		type: String,
		default: ''
	}
})
defineSlots<{
	default(props: {}): any
}>()
</script>

<template>
	<div class="text-4xl font-bold">
		<h2 class="text-gray-700 dark:text-gray-200">
			<slot>{{ text }}</slot>
		</h2>
	</div>
</template>
