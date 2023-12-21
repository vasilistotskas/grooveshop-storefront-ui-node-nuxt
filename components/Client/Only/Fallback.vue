<script lang="ts" setup>
import type { PropType } from 'vue'

defineProps({
	width: {
		type: [Number, String],
		default: 'auto'
	},
	height: {
		type: [Number, String],
		default: 'auto'
	},
	borderRadius: {
		type: String,
		required: false,
		default: '5px'
	},
	showAnimation: {
		type: Boolean,
		default: true
	},
	text: {
		type: String,
		default: 'Loading...'
	},
	textVisibility: {
		type: String as PropType<'hidden' | 'visible'>,
		default: 'hidden'
	},
	textColor: {
		type: String,
		default: 'black'
	}
})
</script>

<template>
	<USkeleton
		class="grid"
		:style="{
			width: width,
			height: height,
			borderRadius: borderRadius
		}"
		:ui="{ background: showAnimation ? 'bg-gray-300 dark:bg-gray-600' : 'transparent' }"
	>
		<p
			class="grid place-items-center font-semibold"
			:style="{ color: textColor, visibility: textVisibility }"
			v-text="text"
		></p
	></USkeleton>
</template>
