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
		class="empty-state text-primary-700 dark:text-primary-100 flex flex-col items-center justify-center gap-4 rounded-lg border border-gray-900/10 p-16 text-center dark:border-gray-50/[0.2]"
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
