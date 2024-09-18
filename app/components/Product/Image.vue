<script lang="ts" setup>
import type { PropType } from 'vue'

import type { ImageLoading } from '~/types'
import type { ProductImage } from '~/types/product/image'

const props = defineProps({
  image: {
    type: Object as PropType<ProductImage>,
    required: false,
    default: undefined,
  },
  width: {
    type: Number,
    default: 604,
  },
  height: {
    type: Number,
    default: 319,
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
    default: 'sm:562px md:349px lg:461px xl:589px xxl:300px 2xl:604px',
  },
})

const { image } = toRefs(props)
const { locale } = useI18n()

const alt = computed(() => {
  return (
    extractTranslated(props.image, 'title', locale.value) || 'Product image'
  )
})
</script>

<template>
  <ImgWithFallback
    :loading="imgLoading"
    provider="mediaStream"
    :width="width"
    :height="height"
    fit="contain"
    :background="'ffffff'"
    :sizes="sizes"
    :src="image?.mainImagePath"
    :alt="alt"
    densities="x1"
  />
</template>
