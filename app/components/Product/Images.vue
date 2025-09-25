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

const { data: images } = await useFetch(
  `/api/products/${product.value.id}/images`,
  {
    key: `productImages${product.value.id}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      language: locale,
    },
  },
)

const selectedImage = ref(images.value?.find(image => image.isMain || image.id === images.value?.[0]?.id))
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
    class="flex flex-col"
    :class="[images && images?.length > 1 ? 'gap-4' : '']"
  >
    <UCard variant="soft">
      <ProductImage
        :image="selectedImage"
        img-loading="eager"
        class="rounded-md"
      />
    </UCard>

    <LazyUCarousel
      v-if="images && images?.length > 1"
      v-slot="{ item }"
      :items="images"
      :ui="{ item: 'basis-1/2 lg:basis-1/3', container: 'gap-2' }"
      class="overflow-hidden rounded-lg"
      arrows
    >
      <button
        :class="{
          'ring-2 ring-indigo-300 ring-inset': selectedImageId === item.id,
        }"
        type="button"
        class="
          flex w-full items-center justify-center rounded-lg bg-primary-100 p-2
          hover:cursor-pointer
          focus:outline-none
          md:h-32
          dark:bg-primary-900
        "
        :aria-label="`Select image ${item.id}`"
        @click="selectedImageId = item.id"
      >
        <ProductImage
          :key="item.id"
          :image="item"
          :width="200"
          :height="120"
          img-loading="lazy"
          class="rounded-md"
        />
      </button>
    </LazyUCarousel>
  </div>
</template>
