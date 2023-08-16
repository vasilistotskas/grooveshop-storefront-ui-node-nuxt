<script lang="ts" setup>
const props = defineProps({
	title: {
		type: String,
		required: false,
		default: 'common.empty.title'
	},
	description: {
		type: String,
		required: false,
		default: 'common.empty.description'
	},
	icon: {
		type: Object,
		required: true
	}
})

defineSlots<{
	actions(props: {}): any
}>()
</script>

<template>
	<div
		class="empty-state flex flex-col gap-4 items-center justify-center border border-gray-900/10 dark:border-gray-50/[0.2] rounded-lg p-16 text-center text-gray-700 dark:text-gray-200"
	>
		<div class="empty-state-icon">
			<component :is="icon" />
		</div>
		<div class="empty-state-title">
			{{ $t(title) }}
		</div>
		<div class="empty-state-description">
			{{ $t(description) }}
		</div>
		<div class="empty-state-actions">
			<slot name="actions"></slot>
		</div>
	</div>
</template>
