<script lang="ts" setup>
import type { ExtractPropTypes } from 'vue'
import type { baseImageProps } from '#image/components/_base'

interface Props extends /* @vue-ignore */ Omit<ExtractPropTypes<typeof baseImageProps>, 'ismap'> {
  src?: string
  fallback?: string
  ismap?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  src: undefined,
  fallback: '/img/placeholder.png',
  quality: 80,
  ismap: true,
})

const emit = defineEmits(['error', 'load'])

const attrs = useAttrs()

const hasError = ref(false)

const mainImageProps = computed(() => {
  const { fallback, src, ...restProps } = props
  return { ...attrs, ...restProps }
})

const fallbackImageProps = computed(() => {
  const { fallback, src, ...restProps } = props
  return { ...attrs, ...restProps }
})

const imgSrc = computed(() => {
  if (!props.src) return props.fallback
  return props.src
})

const handleError = (error: string | Event) => {
  console.info('Image error:', error)
  emit('error', error)
  hasError.value = true
}

const provider = computed(() => {
  if (!props.src) {
    return 'ipx'
  }
  if (mainImageProps.value?.provider !== undefined && mainImageProps.value.provider !== '') {
    return mainImageProps.value.provider
  }
  if (imgSrc.value.startsWith('media/uploads') || imgSrc.value.startsWith('static/images')) {
    return 'mediaStream'
  }
  return 'ipx'
})
</script>

<template>
  <NuxtImg
    v-if="!hasError || !fallback"
    v-bind="mainImageProps"
    :src="imgSrc"
    :provider="provider"
    @error="handleError"
    @load="emit('load', $event)"
  />
  <NuxtImg
    v-else
    v-bind="fallbackImageProps"
    :src="fallback"
    alt="fallback"
    provider="ipx"
    :modifiers="{
      fit: 'cover',
    }"
  />
</template>
