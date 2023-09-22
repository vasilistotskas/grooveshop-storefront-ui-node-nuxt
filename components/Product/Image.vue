<script lang="ts" setup>
import { PropType } from 'vue'
import { Image } from '~/types/product/image'

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
		loading="auto"
		provider="mediaStream"
		class="rounded-full"
		decoding="async"
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
