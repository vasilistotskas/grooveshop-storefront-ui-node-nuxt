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
	<div class="text-2xl font-semibold mb-2">
		<p class="text-primary-700 dark:text-primary-100">
			<slot>{{ text }}</slot>
		</p>
	</div>
</template>
