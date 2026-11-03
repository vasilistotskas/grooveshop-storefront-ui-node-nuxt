<script lang="ts" setup>
import type { PropType } from 'vue'

/**
 * One product photograph, cropped to fill its frame on the sunken tile
 * the gallery, the zoom viewer and the sticky bar draw it on.
 *
 * `x1 x2` densities: the frames are fixed sizes, so a 2x screen gets a
 * photograph twice the frame's width instead of an upscaled one.
 */
defineProps({
  image: {
    type: Object as PropType<ProductImage>,
    required: false,
    default: undefined,
  },
  /** The photograph's alt text, from `useProductImageAlt`. */
  alt: {
    type: String,
    required: true,
  },
  width: {
    type: [Number, String],
    default: 680,
  },
  height: {
    type: [Number, String],
    default: 680,
  },
  imgLoading: {
    type: String as PropType<ImageLoading>,
    required: false,
    default: undefined,
    validator: (value: string) => ['lazy', 'eager'].includes(value),
  },
  sizes: {
    type: String,
    required: false,
  },
})
</script>

<template>
  <ImgWithFallback
    :loading="imgLoading"
    :width="width"
    :height="height"
    fit="cover"
    :sizes="sizes"
    densities="x1 x2"
    :src="image?.mainImagePath"
    :alt="alt"
  />
</template>
