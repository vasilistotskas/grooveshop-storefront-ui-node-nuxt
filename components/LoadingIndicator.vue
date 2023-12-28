<script lang="ts" setup>
const props = defineProps({
	throttle: {
		type: Number,
		default: 200
	},
	duration: {
		type: Number,
		default: 2000
	},
	height: {
		type: Number,
		default: 3
	},
	color: {
		type: String,
		default: 'repeating-linear-gradient(to right,#00dc82 0%,#34cdfe 50%,#0047e1 100%)'
	}
})

const { duration, throttle } = toRefs(props)

const { progress, isLoading, start, finish, clear } = useLoadingIndicator({
	duration: duration.value,
	throttle: throttle.value
})

defineExpose({
	progress,
	isLoading,
	start,
	finish,
	clear
})
</script>

<template>
	<div
		class="nuxt-loading-indicator"
		:style="{
			position: 'fixed',
			top: 0,
			right: 0,
			left: 0,
			pointerEvents: 'none',
			width: 'auto',
			height: `${height}px`,
			opacity: isLoading ? 1 : 0,
			background: color || undefined,
			backgroundSize: `${(100 / progress) * 100}% auto`,
			transform: `scaleX(${progress}%)`,
			transformOrigin: 'left',
			transition: 'transform 0.1s, height 0.4s, opacity 0.4s',
			zIndex: 999999
		}"
	>
		<slot></slot>
	</div>
</template>
