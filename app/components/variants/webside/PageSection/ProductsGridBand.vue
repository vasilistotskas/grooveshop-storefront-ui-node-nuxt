<script lang="ts" setup>
/**
 * The platform's band of products as a grid, in webside's own cards and the
 * columns of webside's listing, which that card was laid out for: on a phone
 * it is one column, and in two its corner buttons cover its stock badge. What
 * the band does (its heading, its link, disappearing with nothing to list) is
 * the platform's: `products` is the one setting the band cannot go without,
 * and the others pass through as attributes.
 */
defineProps<{
  products: ResolvedQuery<ProductCard, DataDescriptor<'product'>>
}>()
</script>

<template>
  <PageSectionProductsGrid :products="products">
    <template #list="{ items, showAddToCart }">
      <ol
        class="
          grid grid-cols-1 items-center justify-center gap-4
          sm:grid-cols-2
          lg:grid-cols-3 lg:gap-6
          xl:grid-cols-4
        "
      >
        <WebsideProductCard
          v-for="product in items"
          :key="product.id"
          :product="product"
          :show-add-to-cart-button="showAddToCart"
        />
      </ol>
    </template>
  </PageSectionProductsGrid>
</template>
