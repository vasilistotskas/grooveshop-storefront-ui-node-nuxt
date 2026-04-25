<script lang="ts" setup>
import type { PropType } from 'vue'

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

const { image } = toRefs(props)
const { t, locale } = useI18n()

const alt = computed(() => {
  return (
    extractTranslated(props.image, 'title', locale.value) || t('image.product_fallback')
  )
})
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
    quality="100"
  />
</template>

<i18n lang="yaml">
el:
  image:
    product_fallback: Εικόνα προϊόντος
</i18n>
