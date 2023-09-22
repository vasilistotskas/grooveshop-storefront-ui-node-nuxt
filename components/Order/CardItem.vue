<script lang="ts" setup>
import { PropType } from 'vue'
import { OrderItem } from '~/types/order/order-item'

const props = defineProps({
	item: {
		type: Object as PropType<OrderItem>,
		required: true
	}
})

const { item } = toRefs(props)
const { locale } = useLang()
const { resolveImageSrc } = useImageResolver()
const { extractTranslated } = useTranslationExtractor()

const src = computed(() => {
	return resolveImageSrc(
		item.value.product?.mainImageFilename,
		`media/uploads/products/${item.value.product.mainImageFilename}`
	)
})

const alt = computed(() => {
	return extractTranslated(item.value.product, 'name', locale.value)
})
</script>

<template>
	<div class="order-card-items-image">
		<NuxtImg
			preload
			loading="lazy"
			provider="mediaStream"
			class="product-img"
			decoding="async"
			:style="{ objectFit: 'contain', contentVisibility: 'auto' }"
			:width="80"
			:height="80"
			:fit="'contain'"
			:position="'entropy'"
			:background="'transparent'"
			:trim-threshold="5"
			:format="'webp'"
			sizes="`sm:100vw md:50vw lg:auto`"
			:src="src"
			:alt="alt"
		/>
	</div>
</template>
