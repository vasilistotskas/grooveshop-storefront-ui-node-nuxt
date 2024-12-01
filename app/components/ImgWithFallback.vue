<script lang="ts" setup>
import type { ExtractPropTypes } from 'vue'
import type { baseImageProps } from '#image/components/_base'

interface Emits {
  (e: 'error' | 'load', data: any): void
}

const emit = defineEmits<Emits>()

type Props = Omit<ExtractPropTypes<typeof baseImageProps>, 'ismap'> & {
  src?: string
  fallback?: string
  ismap?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  src: undefined,
  fallback: '/img/placeholder.png',
  quality: 100,
  ismap: true,
})

const attrs = useAttrs()

const mainImageProps = computed(() => {
  const { fallback, src, ...restProps } = props
  return { ...attrs, ...restProps }
})

const imgSrc = computed(() => {
  if (!props.src) return props.fallback
  return props.src
})

const getFallbackImageProps = computed(() => {
  const { fallback, src, ...restProps } = props
  return { ...attrs, ...restProps }
})

const hasError = ref(false)

const handleError = (error: any) => {
  emit('error', error)
  hasError.value = true
}
</script>

<template>
  <NuxtImg
    v-if="!hasError || !fallback"
    v-bind="mainImageProps"
    :src="imgSrc"
    :provider="!props.src ? 'ipx' : mainImageProps.provider"
    @error="handleError"
    @load="emit('load', $event)"
  />

  <NuxtImg
    v-else
    v-bind="getFallbackImageProps"
    :src="fallback"
    alt="fallback"
    provider="ipx"
  />
</template>
