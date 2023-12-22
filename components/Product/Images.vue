<script lang="ts" setup>
import type { PropType } from 'vue'
import type { Product } from '~/types/product/product'

const props = defineProps({
	product: {
		type: Object as PropType<Product>,
		required: true
	}
})
const { product } = toRefs(props)

const { isMobile, isTablet, isDesktop } = useDevice()
const productImageStore = useProductImageStore()
const { images } = storeToRefs(productImageStore)
const { fetchImages } = productImageStore

await fetchImages({ product: String(product.value.id) })

const mainImage = ref(images.value?.results?.find((image) => image.isMain) || null)

const selectedImageId = useState<number>(`${product.value.uuid}-imageID`, () => {
	if (!images.value?.results) {
		return 0
	}
	return mainImage.value?.id || images.value?.results[0]?.id || 0
})

const gridAutoColumns = computed(() => {
	if (isMobile) {
		return '100%'
	}
	if (isTablet) {
		return '50%'
	}
	if (isDesktop) {
		return '33.333333%'
	}
	return '100%'
})

watch(
	() => selectedImageId.value,
	(value) => {
		const image = images.value?.results?.find((image) => image.id === value)
		if (image) {
			mainImage.value = image
		}
	}
)
</script>

<template>
	<div
		class="grid"
		:class="[images?.results && images?.results?.length > 1 ? 'gap-4' : '']"
	>
		<div
			class="grid items-center justify-center justify-items-center h-64 md:h-80 rounded-lg bg-zinc-100"
		>
			<ProductImage :image="mainImage" :width="572" :height="320" img-loading="eager" />
		</div>

		<LazyNativeSlideShow
			v-if="images?.results && images?.results?.length > 1"
			:grid-auto-columns="gridAutoColumns"
			:component-element="'ol'"
		>
			<li
				v-for="productImage in images?.results"
				:key="productImage.id"
				class="flex-1 px-2"
			>
				<button
					:class="{
						'ring-2 ring-indigo-300 ring-inset': selectedImageId === productImage.id
					}"
					type="button"
					class="focus:outline-none w-full rounded-lg h-24 md:h-32 bg-zinc-100 flex items-center justify-center p-2"
					:aria-label="`Select image ${productImage.id}`"
					@click="selectedImageId = productImage.id"
				>
					<ProductImage
						:key="productImage.id"
						:image="productImage"
						:width="159"
						:height="116"
						img-loading="lazy"
					/>
				</button>
			</li>
		</LazyNativeSlideShow>
	</div>
</template>
