<script lang="ts" setup>
/**
 * The platform's band of products as a grid, in webside's own cards. What the
 * band does (its heading, its link, disappearing with nothing to list) is the
 * platform's, so this file holds only the card: `products` is the one setting
 * the band cannot go without, and the others pass through as attributes.
 */
defineProps<{
  products: ResolvedQuery<ProductCard, DataDescriptor<'product'>>
}>()
</script>

<template>
  <PageSectionProductsGrid :products="products">
    <template #card="{ product, showAddToCart }">
      <WebsideProductCard
        :product="product"
        :show-add-to-cart-button="showAddToCart"
      />
    </template>
  </PageSectionProductsGrid>
</template>
