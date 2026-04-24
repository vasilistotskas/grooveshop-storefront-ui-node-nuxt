<script lang="ts" setup>
import type { ExtractPropTypes } from 'vue'
import type { baseImageProps } from '#image/components/_base'

interface Props extends /* @vue-ignore */ Omit<ExtractPropTypes<typeof baseImageProps>, 'ismap'> {
  src?: string
  fallback?: string
  ismap?: boolean
  preload?: boolean
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

const provider = computed(() => {
  if (!props.src) {
    return 'ipx'
  }
  if (mainImageProps.value?.provider !== undefined && mainImageProps.value.provider !== '') {
    return mainImageProps.value.provider
  }
  // `media/{schema}/uploads/...` is the tenant-scoped path produced by
  // Django's ``image_to_media_path`` under TenantFileSystemStorage; the
  // older `media/uploads/...` is the legacy single-tenant path kept for
  // assets uploaded before the storage switch. Both route to the
  // media-stream provider so background processing / caching kicks in.
  if (/^\/?media\/[^/]+\/uploads(\/|$)/.test(imgSrc.value) || imgSrc.value.startsWith('media/uploads') || imgSrc.value.startsWith('/media/uploads') || imgSrc.value.startsWith('static/images') || imgSrc.value.startsWith('/static/images')) {
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
