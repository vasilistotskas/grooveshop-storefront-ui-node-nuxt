<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  product: {
    type: Object as PropType<Product>,
    required: true,
  },
})

const { product } = toRefs(props)
const { locale } = useI18n()

const { data: images } = await useFetch<ProductImage[]>(
  `/api/products/${product.value.id}/images`,
  {
    key: `productImages${product.value.id}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      language: locale.value,
    },
  },
)

const selectedImage = ref(images.value?.find(image => image.isMain))
const selectedImageId = ref(selectedImage.value?.id)

watch(
  () => selectedImageId.value,
  (value) => {
    const image = images.value?.find(image => image.id === value)
    if (image) {
      selectedImage.value = image
    }
  },
  { deep: true, immediate: true },
)
</script>

<template>
  <div
    class="grid"
    :class="[images && images?.length > 1 ? 'gap-4' : '']"
  >
    <div
      class="
        bg-primary-100 grid items-center justify-center justify-items-center
        rounded-lg

        dark:bg-primary-900
      "
    >
      <ProductImage
        :image="selectedImage"
        img-loading="eager"
      />
    </div>

    <LazyUCarousel
      v-if="images && images?.length > 1"
      v-slot="{ item }"
      :items="images"
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
          class="
            bg-primary-100 flex w-full items-center justify-center rounded-lg
            p-2

            dark:bg-primary-900

            focus:outline-none

            md:h-32
          "
          :aria-label="`Select image ${item.id}`"
          @click="selectedImageId = item.id"
        >
          <ProductImage
            :key="item.id"
            :image="item"
            :width="201"
            :height="128"
            sizes="sm:281px md:160px lg:153px xl:195px xxl:201px 2xl:201px"
            img-loading="lazy"
          />
        </button>
      </div>
    </LazyUCarousel>
  </div>
</template>
