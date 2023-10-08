<script lang="ts" setup>
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
		type: String,
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
		class="client-only-fallback"
		:ui="{ background: showAnimation ? 'bg-gray-300 dark:bg-gray-600' : 'transparent' }"
	>
		<p class="client-only-fallback-text" v-text="text"></p>
	</USkeleton>
</template>

<style lang="scss" scoped>
.client {
	&-only {
		&-fallback {
			border-radius: v-bind(borderRadius);
			display: grid;
			width: v-bind(width);
			height: v-bind(height);

			&-text {
				display: grid;
				align-items: center;
				justify-items: center;
				justify-content: center;
				visibility: v-bind(textVisibility);
				color: v-bind(textColor);
				font-weight: 600;
			}
		}
	}
}
</style>
