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
	<div class="text-primary-700 dark:text-primary-100 text-xs font-bold text-center mb-2">
		<slot>{{ text }}</slot>
	</div>
</template>
