<script lang="ts" setup>
import { baseImageProps } from '#image/components/_base'
import type { ExtractPropTypes } from 'vue'

interface Emits {
	(e: 'error', data: any): void
	(e: 'load', data: any): void
}

const emit = defineEmits<Emits>()

type Props = ExtractPropTypes<typeof baseImageProps> & {
	src?: string
	fallback?: string
}

const props = withDefaults(defineProps<Props>(), {
	src: undefined,
	fallback: '/assets/images/placeholder.png',
	quality: 100
})

const attrs = useAttrs()

const propsWithoutFallbackAndSrc = computed(() => {
	const { fallback, src, ...restProps } = props

	return { ...attrs, ...restProps }
})

const hasError = ref(false)

const handleError = (data: any) => {
	emit('error', data)
	hasError.value = true
}
</script>

<template>
	<NuxtImg
		v-if="!hasError || !fallback"
		v-bind="propsWithoutFallbackAndSrc"
		:src="src"
		@error="handleError"
		@load="emit('load', $event)"
	/>
	<NuxtImg v-else v-bind="propsWithoutFallbackAndSrc" :src="fallback" alt="fallback" />
</template>
