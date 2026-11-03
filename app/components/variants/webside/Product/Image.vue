<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
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

const { image } = toRefs(props)
</script>

<template>
  <ImgWithFallback
    :loading="imgLoading"
    :width="width"
    :height="height"
    fit="contain"
    :background="'ffffff'"
    :sizes="sizes"
    :src="image?.mainImagePath"
    :alt="alt"
  />
</template>
