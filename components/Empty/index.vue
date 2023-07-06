<script lang="ts" setup>
const props = defineProps({
	text: {
		type: String,
		required: true
	}
})
</script>

<template>
	<div
		class="flex flex-col items-center justify-center border border-gray-900/10 dark:border-gray-50/[0.2] rounded-lg p-16"
	>
		<p class="text-center text-gray-700 dark:text-gray-200">
			{{ text }}
		</p>
	</div>
</template>
