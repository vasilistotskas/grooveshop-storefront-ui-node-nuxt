<script lang="ts" setup>
import { PropType } from 'vue'
import { Product } from '~/types/product/product'

const props = defineProps({
	product: {
		type: Object as PropType<Product>,
		required: true
	}
})

const { product } = toRefs(props)
const { locale } = useLang()
const { extractTranslated } = useTranslationExtractor()

const imagesStore = useImagesStore()

await imagesStore.fetchImages({ product: String(product.value.id) })

const { images, error } = storeToRefs(imagesStore)

const mainImage = computed(() => {
	if (!images.value?.results) {
		return null
	}
	return images.value.results.find((image) => image.isMain)
})

const { resolveImageFileExtension } = useImageResolver()

const imageId = useState<number>(`${product.value.uuid}-imageID`, () => {
	if (!images?.value?.results) {
		return 0
	}
	return mainImage.value?.id || images?.value.results[0]?.id || 0
})
</script>

<template>
	<div class="grid">
		<div class="h-64 md:h-80 rounded-lg bg-gray-100 mb-4">
			<div
				v-for="(productImage, index) in images?.results"
				v-show="imageId === productImage.id"
				:key="index"
				class="product-images-main grid h-64 md:h-80 rounded-lg bg-gray-100 mb-4 items-center justify-center"
				:class="{
					'main-image': imageId === productImage.id
				}"
			>
				<NuxtImg
					preload
					placeholder
					loading="lazy"
					provider="mediaStream"
					class="h-64 md:h-80 rounded-lg bg-gray-100 flex items-center justify-center"
					:style="{ objectFit: 'contain' }"
					:width="592"
					:height="350"
					:fit="'contain'"
					:position="'entropy'"
					:background="'transparent'"
					:trim-threshold="5"
					:format="resolveImageFileExtension(productImage.mainImageFilename)"
					sizes="sm:100vw md:50vw lg:592px"
					:src="
						`media/uploads/products/${productImage.mainImageFilename}` ||
						'/assets/images/placeholder.png'
					"
					:alt="extractTranslated(product, 'name', locale) || ''"
				/>
			</div>
		</div>

		<div
			v-if="images?.results && images?.results?.length > 1"
			class="product-images-others flex -mx-2 mb-4"
		>
			<template v-for="(productImage, index) in images?.results" :key="index">
				<div class="flex-1 px-2">
					<button
						:class="{
							'ring-2 ring-indigo-300 ring-inset': imageId === productImage.id
						}"
						type="button"
						class="focus:outline-none w-full rounded-lg h-24 md:h-32 bg-gray-100 flex items-center justify-center"
						@click="imageId = productImage.id"
					>
						<NuxtImg
							preload
							placeholder
							loading="lazy"
							provider="mediaStream"
							:style="{ objectFit: 'contain' }"
							:width="278"
							:height="128"
							:fit="'contain'"
							:position="'entropy'"
							:background="'transparent'"
							:trim-threshold="5"
							:format="resolveImageFileExtension(productImage.mainImageFilename)"
							sizes="sm:100vw md:50vw lg:278px"
							:src="
								`media/uploads/products/${productImage.mainImageFilename}` ||
								'/assets/images/placeholder.png'
							"
							:alt="extractTranslated(product, 'name', locale) || ''"
						/>
					</button>
				</div>
			</template>
		</div>
	</div>
</template>
