<script lang="ts" setup>
import type { ConfiguredImageProviders, ImageModifiers } from '@nuxt/image'

// NuxtImg props this wrapper types and forwards explicitly; any other native
// `<img>`/NuxtImg attribute still flows through `useAttrs()` below.
interface Props {
  src?: string
  fallback?: string
  provider?: keyof ConfiguredImageProviders
  width?: string | number
  height?: string | number
  sizes?: string
  densities?: string
  format?: string
  quality?: string | number
  fit?: string
  background?: string
  modifiers?: Partial<ImageModifiers> & Record<string, unknown>
  preload?: boolean
  ismap?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  src: undefined,
  fallback: '/img/placeholder.png',
  quality: 80,
  ismap: true,
  preload: false,
})

const emit = defineEmits(['error', 'load'])

const attrs = useAttrs()

const hasError = ref(false)

const mainImageProps = computed(() => {
  const { fallback, src, preload, ...restProps } = props
  return { ...attrs, ...restProps, preload }
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
  log.info('image', 'Image error')
  emit('error', error)
  hasError.value = true
}

// SVGs are vectors (or, worse, raster wrapped in SVG) and rasterizing them
// through an image pipeline destroys quality — always serve them untouched
// unless the caller explicitly chose a provider.
const isSvg = (src: string) => /\.svg(\?|#|$)/i.test(src)

const provider = computed<keyof ConfiguredImageProviders>(() => {
  if (!props.src) {
    return 'ipx'
  }
  if (mainImageProps.value.provider) {
    return mainImageProps.value.provider
  }
  if (isSvg(imgSrc.value)) {
    return 'none'
  }
  if (imgSrc.value.startsWith('media/uploads') || imgSrc.value.startsWith('/media/uploads') || imgSrc.value.startsWith('static/images') || imgSrc.value.startsWith('/static/images')) {
    return 'mediaStream'
  }
  return 'ipx'
})

// Lock the intrinsic aspect ratio on the element when width & height props
// are numeric so the layout reserves space before the image loads (avoids
// CLS even if parent CSS overrides `width`/`height` to `auto`).
const aspectStyle = computed(() => {
  const w = Number(props.width)
  const h = Number(props.height)
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return undefined
  }
  return { aspectRatio: `${w} / ${h}` }
})
</script>

<template>
  <NuxtImg
    v-if="!hasError || !fallback"
    v-bind="mainImageProps"
    :src="imgSrc"
    :provider="provider"
    :style="aspectStyle"
    @error="handleError"
    @load="emit('load', $event)"
  />
  <NuxtImg
    v-else
    v-bind="fallbackImageProps"
    :src="fallback"
    :alt="($attrs.alt as string) || ''"
    provider="ipx"
    :style="aspectStyle"
    :modifiers="{
      fit: 'cover',
    }"
  />
</template>
