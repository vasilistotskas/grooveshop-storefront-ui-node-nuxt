<script lang="ts" setup>
import type { ConfiguredImageProviders, ImageModifiers } from '@nuxt/image'
import { hasProtocol, joinURL } from 'ufo'

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

const handleError = (error: string | Event) => {
  log.info('image', 'Image error')
  emit('error', error)
  hasError.value = true
}

const isSvg = (src: string) => /\.svg(\?|#|$)/i.test(src)

// The raw (pre-provider-resolution) src — same fallback semantics as the
// old `imgSrc` computed. Provider selection below reads THIS, not the
// final (possibly tenant-absolutized) `imgSrc`, to avoid a circular
// computed dependency.
const rawSrc = computed(() => {
  if (!props.src) return props.fallback
  return props.src
})

const provider = computed<keyof ConfiguredImageProviders>(() => {
  if (!props.src) {
    return 'ipx'
  }
  if (mainImageProps.value.provider) {
    return mainImageProps.value.provider
  }
  // Media/static-origin assets must resolve through the mediaStream provider,
  // which prepends the service origin — a bare ``none`` pass-through would
  // serve the relative path against the site origin and 404. This applies to
  // SVGs too, so it must come before the SVG bypass below. `media/{schema}/uploads/...`
  // is the tenant-scoped path produced by Django's ``image_to_media_path`` under
  // TenantFileSystemStorage; the plain `media/uploads/...` prefix is the legacy
  // single-tenant path kept for assets uploaded before the storage switch.
  if (/^\/?media\/[^/]+\/uploads(\/|$)/.test(rawSrc.value) || rawSrc.value.startsWith('media/uploads') || rawSrc.value.startsWith('/media/uploads') || rawSrc.value.startsWith('static/images') || rawSrc.value.startsWith('/static/images')) {
    return 'mediaStream'
  }
  // Local/public SVGs are served raw (never rasterized through IPX, which
  // destroys vector — or embedded-raster — quality).
  if (isSvg(rawSrc.value)) {
    return 'none'
  }
  return 'ipx'
})

// mediaStream-routed sources are absolutized against the tenant-aware base
// URL (assetsDomain when the tenant has one, else the platform env
// origin) BEFORE reaching NuxtImg — see useMediaStreamBaseUrl for why the
// provider itself can't do this per-request.
const mediaStreamBaseUrl = useMediaStreamBaseUrl()

const imgSrc = computed(() => {
  if (provider.value === 'mediaStream' && !hasProtocol(rawSrc.value)) {
    return joinURL(mediaStreamBaseUrl.value, rawSrc.value)
  }
  return rawSrc.value
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
