<script lang="ts" setup>
const props = defineProps({
  pageSize: {
    type: Number,
    default: 6,
  },
  showArrows: {
    type: Boolean,
    default: true,
  },
  showDots: {
    type: Boolean,
    default: false,
  },
})

const { pageSize } = toRefs(props)
const { locale } = useI18n()
const { isMobileOrTablet } = useDevice()

const { data: products } = await useFetch(`/api/products`, {
  key: 'productsSlider',
  method: 'GET',
  headers: useRequestHeaders(),
  query: {
    pageSize: pageSize,
    languageCode: locale,
    ordering: '-createdAt',
  },
})

const productResults = computed(() => products.value?.results ?? [])
</script>

<template>
  <div class="relative">
    <LazyUCarousel
      v-if="productResults && productResults.length > 0"
      v-slot="{ item, index }"
      :items="productResults"
      :ui="{
        container: 'p-4',
        item: 'basis-full md:basis-1/3 lg:basis-1/4 px-2',
        prev: 'top-1/2 -translate-y-1/2',
        next: 'top-1/2 -translate-y-1/2',
      }"
      :arrows="showArrows"
      :dots="showDots"
      :prev="{
        color: 'neutral',
        variant: 'soft',
        size: 'lg',
        square: true,
      }"
      :next="{
        color: 'neutral',
        variant: 'soft',
        size: 'lg',
        square: true,
      }"
      class="
        mx-auto w-full max-w-(--container-main)
        md:!p-0
      "
    >
      <ProductCard
        :product="item"
        :img-loading="index > 2 ? 'lazy' : 'eager'"
        :img-width="isMobileOrTablet ? 575 : 440"
        :img-height="isMobileOrTablet ? 670 : 440"
        :show-description="false"
        :show-start-price="true"
        :show-vat="false"
      />
    </LazyUCarousel>
  </div>
</template>
