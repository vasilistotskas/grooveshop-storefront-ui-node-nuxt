<script lang="ts" setup>
import type { PropType } from 'vue'

import type { ImageLoading } from '~/types/global/general'
import type { ProductImage } from '~/types/product/image'

const props = defineProps({
	image: {
		type: Object as PropType<ProductImage | null>,
		required: false,
		default: null
	},
	width: {
		type: Number,
		default: 572
	},
	height: {
		type: Number,
		default: 320
	},
	imgLoading: {
		type: String as PropType<ImageLoading>,
		required: false,
		default: undefined,
		validator: (value: string) => ['lazy', 'eager'].includes(value)
	}
})

const { locale } = useI18n()
const { resolveImageSrc } = useImageResolver()
const { extractTranslated } = useTranslationExtractor()

const src = computed(() => {
	return resolveImageSrc(
		props.image?.mainImageFilename,
		`media/uploads/products/${props.image?.mainImageFilename}`
	)
})

const alt = computed(() => {
	return extractTranslated(props.image, 'title', locale.value)
})
</script>

<template>
  <NuxtPicture
    :loading="imgLoading"
    provider="mediaStream"
    :width="width"
    :height="height"
    :fit="'contain'"
    :position="'entropy'"
    :background="'transparent'"
    :trim-threshold="5"
    :sizes="`xs:${width}px sm:${width}px md:${
      width / 2
    }px lg:${width}px xl:${width}px xxl:${width}px 2xl:${width}px`"
    :src="src"
    :alt="alt"
    densities="x1"
  />
</template>
