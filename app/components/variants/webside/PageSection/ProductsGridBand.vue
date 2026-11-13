<script lang="ts" setup>
/**
 * The platform's band of products as a grid, in webside's own cards: two
 * columns on a phone, where the card draws itself compactly (its container is
 * narrow: `Product/Card.vue`), and 260px columns from `sm` up. What
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
    <template #list="{ items, showAddToCart, phoneHidden, categories }">
      <!-- Two columns 12px apart on a phone; from `sm` up as many 260px
           columns as fit, 24px apart: four at 1440 in the store's measure. -->
      <ol
        class="
          grid grid-cols-2 gap-3
          sm:grid-cols-[repeat(auto-fill,minmax(min(100%,16.25rem),1fr))]
          sm:gap-6
        "
      >
        <WebsideProductCard
          v-for="(product, index) in items"
          :key="product.id"
          :product="product"
          :show-add-to-cart-button="showAddToCart"
          :class="phoneHidden(index) && 'max-sm:hidden'"
        />
        <PageSectionProductsCategoryTile :categories="categories" />
      </ol>
    </template>
  </PageSectionProductsGrid>
</template>
