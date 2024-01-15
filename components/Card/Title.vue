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
	<div class="mb-2 text-xl font-semibold">
		<p class="text-primary-700 dark:text-primary-100">
			<slot>
				{{ text }}
			</slot>
		</p>
	</div>
</template>
