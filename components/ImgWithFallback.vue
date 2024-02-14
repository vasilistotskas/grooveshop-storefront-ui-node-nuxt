<script lang="ts" setup>
import type { ExtractPropTypes } from 'vue'
import { baseImageProps } from '#image/components/_base'

type Props = ExtractPropTypes<typeof baseImageProps> & {
	fallbackSrc?: string
}

const props = withDefaults(defineProps<Props>(), {
	src: undefined,
	format: undefined,
	quality: 100,
	background: undefined,
	fit: undefined,
	modifiers: undefined,
	preset: undefined,
	provider: undefined,
	sizes: undefined,
	densities: undefined,
	preload: false,
	width: undefined,
	height: undefined,
	alt: undefined,
	referrerpolicy: undefined,
	usemap: undefined,
	longdesc: undefined,
	ismap: false,
	loading: undefined,
	crossorigin: undefined,
	decoding: undefined,
	nonce: undefined,
	fallbackSrc: '/assets/images/placeholder.png'
})

const imgLoadError = ref(false)
const onImgError = () => {
	imgLoadError.value = true
}
</script>

<template>
	<NuxtImg v-if="!imgLoadError" v-bind="props" @error="onImgError" />
	<NuxtImg v-else v-bind="props" :src="fallbackSrc" />
</template>
