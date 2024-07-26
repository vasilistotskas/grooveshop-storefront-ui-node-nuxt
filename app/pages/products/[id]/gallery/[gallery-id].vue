<script setup lang="ts">
const router = useRouter()
const { locale } = useI18n()
const localePath = useLocalePath()

const productId = computed(() => router.currentRoute.value.params.id as string)

const { data: product } = await useLazyFetch(
  `/api/products/${productId.value}`,
  {
    key: `product${productId.value}`,
    method: 'GET',
    query: {
      language: locale.value,
    },
    pick: ['id', 'absoluteUrl'],
  },
)

const { data: images } = await useLazyFetch(
  `/api/products/${productId.value}/images`,
  {
    key: `productImages${productId.value}`,
    method: 'GET',
    query: {
      language: locale.value,
    },
  },
)

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="grid">
    <PageBody>
      <div
        v-if="product"
        class="grid items-center justify-center"
      >
        <UButton
          class="mb-4 w-full"
          color="primary"
          :label="$t('common.back')"
          :to="localePath(`/products${product.absoluteUrl}`)"
          size="xl"
        />
      </div>
      <UCarousel
        v-if="images && images?.length > 1"
        v-slot="{ item }"
        :items="images"
        :ui="{ item: 'basis-1/2 lg:basis-1/3', container: 'gap-2' }"
        class="overflow-hidden rounded-lg"
        arrows
      >
        <div class="flex-1">
          <ProductImage
            :key="item.id"
            :image="item"
            :width="650"
            :height="650"
            img-loading="lazy"
          />
        </div>
      </UCarousel>
    </PageBody>
  </PageWrapper>
</template>
