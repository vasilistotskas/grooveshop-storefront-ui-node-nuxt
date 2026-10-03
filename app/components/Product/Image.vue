<script lang="ts" setup>
import type { PropType } from 'vue'

/**
 * One product photograph, cropped to fill its frame on the sunken tile
 * the gallery, the zoom viewer and the sticky bar draw it on.
 *
 * `x1 x2` densities: the frames are fixed sizes, so a 2x screen gets a
 * photograph twice the frame's width instead of an upscaled one.
 */
const props = defineProps({
  image: {
    type: Object as PropType<ProductImage>,
    required: false,
    default: undefined,
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

const { t, locale } = useI18n()

// The merchant's alt text describes the photograph; the title names it.
const alt = computed(() =>
  props.image?.altText
  || extractTranslated(props.image, 'title', locale.value)
  || t('image.product_fallback'),
)
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
    quality="75"
  />
</template>

<i18n lang="yaml">
el:
  image:
    product_fallback: Εικόνα προϊόντος
en:
  image:
    product_fallback: Product image
</i18n>
