<script lang="ts" setup>
import type { PropType } from 'vue'

import type { ProductImage } from '~/types/product/image'
import type { Product } from '~/types/product/product'

const props = defineProps({
  product: {
    type: Object as PropType<Product>,
    required: true,
  },
})
const { product } = toRefs(props)

const { data: productImages } = await useFetch(`/api/products/images`, {
  key: `productImages${product.value.id}`,
  method: 'GET',
  query: {
    product: product.value.id,
  },
})

const mainImage = ref(
  productImages.value?.results?.find((image) => image.isMain),
)

const selectedImageId = useState<number>(
  `${product.value.uuid}-imageID`,
  () => {
    if (!productImages.value?.results) {
      return 0
    }
    return mainImage.value?.id || productImages.value?.results[0]?.id || 0
  },
)

watch(
  () => selectedImageId.value,
  (value) => {
    const image = productImages.value?.results?.find(
      (image) => image.id === value,
    )
    if (image) {
      mainImage.value = image
    }
  },
)
</script>

<template>
  <div
    class="grid"
    :class="[
      productImages?.results && productImages?.results?.length > 1
        ? 'gap-4'
        : '',
    ]"
  >
    <div
      class="inline-table h-64 items-center justify-center justify-items-center rounded-lg bg-zinc-100 md:grid md:h-80"
    >
      <ProductImage
        :image="mainImage"
        :width="572"
        :height="320"
        img-loading="eager"
      />
    </div>

    <UCarousel
      v-if="productImages?.results && productImages?.results?.length > 1"
      v-slot="{ item }"
      :items="productImages?.results"
      :ui="{ item: 'basis-full md:basis-1/2 lg:basis-1/3' }"
      class="overflow-hidden rounded-lg"
      arrows
    >
      <div class="flex-1 px-2">
        <button
          :class="{
            'ring-2 ring-inset ring-indigo-300': selectedImageId === item.id,
          }"
          type="button"
          class="flex w-full items-center justify-center rounded-lg bg-zinc-100 p-2 focus:outline-none md:h-32"
          :aria-label="`Select image ${item.id}`"
          @click="selectedImageId = item.id"
        >
          <ProductImage
            :key="item.id"
            :image="item"
            :width="159"
            :height="116"
            img-loading="lazy"
          />
        </button>
      </div>
    </UCarousel>
  </div>
</template>
