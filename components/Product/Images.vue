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

const { data: productImages } = await useFetch(
  `/api/products/${product.value.id}/images`,
  {
    key: `productImages${product.value.id}`,
    method: 'GET',
  },
)

const mainImage = ref(productImages.value?.find((image) => image.isMain))

const selectedImageId = useState<number>(
  `${product.value.uuid}-imageID`,
  () => {
    if (!productImages.value) {
      return 0
    }
    return mainImage.value?.id || productImages.value[0]?.id || 0
  },
)

watch(
  () => selectedImageId.value,
  (value) => {
    const image = productImages.value?.find((image) => image.id === value)
    if (image) {
      mainImage.value = image
    }
  },
)
</script>

<template>
  <div
    class="grid"
    :class="[productImages && productImages?.length > 1 ? 'gap-4' : '']"
  >
    <div
      class="grid items-center justify-center justify-items-center rounded-lg bg-white dark:bg-zinc-800 md:grid md:h-80"
    >
      <ProductImage
        :image="mainImage"
        :width="572"
        :height="320"
        img-loading="eager"
      />
    </div>

    <UCarousel
      v-if="productImages && productImages?.length > 1"
      v-slot="{ item }"
      :items="productImages"
      :ui="{ item: 'basis-1/2 lg:basis-1/3', container: 'gap-2' }"
      class="overflow-hidden rounded-lg"
      arrows
    >
      <div class="flex-1">
        <button
          :class="{
            'ring-2 ring-inset ring-indigo-300': selectedImageId === item.id,
          }"
          type="button"
          class="flex w-full items-center justify-center rounded-lg bg-white p-2 focus:outline-none dark:bg-zinc-800 md:h-32"
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
