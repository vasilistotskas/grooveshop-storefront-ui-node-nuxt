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
	<div class="grid">
		<div class="h-64 md:h-80 rounded-lg bg-zinc-100 mb-4">
			<ProductImage
				:image="mainImage"
				:width="592"
				:height="350"
				img-loading="eager"
				class="main-image product-images-main grid h-64 md:h-80 rounded-lg bg-zinc-100 mb-4 items-center justify-center"
			/>
		</div>

		<div
			v-if="images?.results && images?.results?.length > 1"
			class="product-images-others flex -mx-2 mb-4"
		>
			<template v-for="productImage in images?.results" :key="productImage.id">
				<div class="flex-1 px-2">
					<button
						:class="{
							'ring-2 ring-indigo-300 ring-inset': selectedImageId === productImage.id
						}"
						type="button"
						class="focus:outline-none w-full rounded-lg h-24 md:h-32 bg-zinc-100 flex items-center justify-center"
						:aria-label="`Select image ${productImage.id}`"
						@click="selectedImageId = productImage.id"
					>
						<ProductImage
							:key="productImage.id"
							:image="productImage"
							:width="278"
							:height="129"
							img-loading="lazy"
						/>
					</button>
				</div>
			</template>
		</div>
	</div>
</template>
