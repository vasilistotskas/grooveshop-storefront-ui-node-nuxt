<script lang="ts" setup>
const props = defineProps({
  productId: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    default: undefined,
  },
  count: {
    type: Number,
    default: 10,
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

const { t } = useI18n()
const { isMobileOrTablet } = useDevice()
const { getProductRecommendations } = useProductRecommendations()

const recommendations = ref([])
const loading = ref(true)

// Fetch recommendations on mount
onMounted(async () => {
  loading.value = true
  // @ts-ignore
  recommendations.value = await getProductRecommendations(props.productId, props.count)
  loading.value = false
})

const displayTitle = computed(() => {
  return props.title || t('product.recommendations.title', 'You May Also Like')
})

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
    v-if="!loading && recommendations.length > 0"
    class="product-recommendations w-full max-w-full py-8"
  >
    <div
      class="
        mb-6 px-4
        md:px-0
      "
    >
      <h2
        class="
          text-2xl font-bold
          md:text-3xl
        "
      >
        {{ displayTitle }}
      </h2>
    </div>

    <LazyUCarousel
      v-slot="{ item, index }"
      :items="recommendations"
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

  <!-- Loading State -->
  <div
    v-else-if="loading"
    class="product-recommendations-loading w-full max-w-full py-8"
  >
    <div
      class="
        mb-6 px-4
        md:px-0
      "
    >
      <USkeleton class="h-8 w-64" />
    </div>
    <div
      class="
        grid grid-cols-2 gap-4 px-4
        md:grid-cols-3 md:px-0
        lg:grid-cols-4
        xl:grid-cols-5
      "
    >
      <USkeleton v-for="i in 5" :key="i" class="h-64 w-full" />
    </div>
  </div>
</template>
