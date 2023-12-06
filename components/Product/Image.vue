<script lang="ts" setup>
import type { PropType } from 'vue'
import type { Image } from '~/types/product/image'
import type { ImageLoading } from '~/types/global/general'

const props = defineProps({
	image: {
		type: Object as PropType<Image | null>,
		required: false,
		default: null
	},
	width: {
		type: Number,
		default: 592
	},
	height: {
		type: Number,
		default: 350
	},
	imgLoading: {
		type: String as PropType<ImageLoading>,
		required: false,
		default: undefined,
		validator: (value: string) => ['lazy', 'eager'].includes(value)
	}
})

const { locale } = useLang()
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
	<NuxtImg
		preload
		:loading="imgLoading"
		provider="mediaStream"
		class="rounded-full"
		:style="{ objectFit: 'contain' }"
		:width="width || 100"
		:height="height || 100"
		:fit="'contain'"
		:position="'entropy'"
		:background="'transparent'"
		:trim-threshold="5"
		:format="'webp'"
		sizes="`sm:100vw md:50vw lg:auto`"
		:src="src"
		:alt="alt"
	/>
</template>
