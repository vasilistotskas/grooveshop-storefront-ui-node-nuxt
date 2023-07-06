<script setup>
import { useMouse, usePointerLock } from '@vueuse/core'
const { lock, unlock, element } = usePointerLock()
const { x, y } = useMouse({ type: 'movement' })
const rotY = ref(-45)
const rotX = ref(0)
watch([x, y], ([x, y]) => {
	if (!element.value) return
	rotY.value += x / 2
	rotX.value -= y / 2
})
</script>

<template>
	<div scene>
		<div cube @mousedown.capture="lock" @mouseup="unlock">
			<span face base style="--i: 1" logo-vue />
			<span face base style="--i: -1" logo-vueuse />
			<span face side style="--i: 0" logo-vue />
			<span face side style="--i: 1" logo-vueuse />
			<span face side style="--i: 2" logo-vue />
			<span face side style="--i: 3" logo-vueuse />
		</div>
	</div>
</template>

<style scoped lang="postcss">
[scene] {
	@apply flex justify-center items-center box-border;
	perspective: 300px;
}
[cube] {
	@apply cursor-all-scroll;
	--rotY: v-bind(rotY);
	--rotX: v-bind(rotX);
	transform: rotateY(calc(var(--rotY) * 1deg)) rotateX(calc(var(--rotX) * 1deg));
	width: 100px;
	height: 100px;
	transform-style: preserve-3d;
}
[face] {
	@apply absolute top-0 left-0 w-full h-full
  bg-opacity-20 bg-center bg-[length:75%] bg-no-repeat;
	border-width: 1px;
	border-style: solid;
	backface-visibility: hidden;
}
[base] {
	transform: rotateX(calc(90deg * var(--i))) translateZ(50px);
}
[side] {
	transform: rotateY(calc(90deg * var(--i))) translateZ(50px);
}
[logo-vue] {
	--un-url: url(/assets/images/websiteLogo_circle.png);
	background-image: var(--un-url);
}
[logo-vueuse] {
	--un-url: url(/assets/images/websiteLogo_circle.png);
	background-image: var(--un-url);
}
</style>
