<script lang="ts" setup>
import type { PropType } from 'vue'
import type { OrderItem } from '~/types/order/order-item'

const props = defineProps({
	item: {
		type: Object as PropType<OrderItem>,
		required: true
	}
})

const { item } = toRefs(props)
const { locale } = useI18n()
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
		<ImgWithFallback
			loading="lazy"
			provider="mediaStream"
			class="product-img bg-white"
			:style="{ objectFit: 'contain', contentVisibility: 'auto' }"
			:width="120"
			:height="120"
			:fit="'contain'"
			:position="'entropy'"
			:background="'transparent'"
			:trim-threshold="5"
			sizes="`sm:100vw md:50vw lg:auto`"
			:src="src"
			:alt="alt"
		/>
	</div>
</template>
