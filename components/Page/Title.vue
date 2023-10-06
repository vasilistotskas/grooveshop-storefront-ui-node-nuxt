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
		<h2 class="text-primary-700 dark:text-primary-100">
			<slot>{{ text }}</slot>
		</h2>
	</div>
</template>
