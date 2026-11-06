<script lang="ts" setup>
/**
 * The platform's rail of products, in webside's own cards. What the band does
 * (its heading, its link, disappearing with nothing to list) is the platform's,
 * so this file holds only the card: `products` is the one setting the band
 * cannot go without, and the others pass through as attributes.
 */
defineProps<{
  products: ResolvedQuery<ProductCard, DataDescriptor<'product'>>
}>()
</script>

<template>
  <PageSectionProductsSlider :products="products">
    <template #card="{ product, showAddToCart }">
      <WebsideProductCard
        as="div"
        :product="product"
        :show-add-to-cart-button="showAddToCart"
      />
    </template>
  </PageSectionProductsSlider>
</template>
