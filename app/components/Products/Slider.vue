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

const mobileUI = {
  root: 'w-full max-w-full',
  viewport: 'overflow-hidden w-full',
  container: 'flex w-full p-6',
  item: 'min-w-0 shrink-0 grow-0 basis-[90%] pl-3 first:pl-0 h-full max-h-full',
}

const desktopUI = {
  container: 'p-4',
  item: 'basis-full md:basis-1/3 lg:basis-1/4 px-2',
}
</script>

<template>
  <div
    class="w-full max-w-full"
  >
    <LazyUCarousel
      v-if="productResults && productResults.length > 0"
      v-slot="{ item, index }"
      :items="productResults"
      :ui="isMobileOrTablet ? mobileUI : desktopUI"
      :arrows="isMobileOrTablet ? false : showArrows"
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
        w-full max-w-full
        md:mx-auto md:max-w-(--container-main)
      "
    >
      <ProductCard
        :product="item"
        :img-loading="index > 2 ? 'lazy' : 'eager'"
        :img-width="isMobileOrTablet ? 280 : 440"
        :img-height="isMobileOrTablet ? 280 : 440"
        :show-description="false"
        :show-start-price="true"
        :show-vat="false"
      />
    </LazyUCarousel>
  </div>
</template>
