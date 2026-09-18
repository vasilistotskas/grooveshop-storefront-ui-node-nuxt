<script lang="ts" setup>
/**
 * What the merchant wants seen first.
 *
 * The same band as `products_slider` with a different default ordering
 * — the store's own arrangement rather than recency — so a homepage can
 * carry both without showing one set of products twice. `columns` is
 * kept for layouts written against the old prop; the rail sizes itself
 * from the viewport, so it only caps how many are fetched.
 */
const props = withDefaults(defineProps<{
  title?: string
  heading?: string
  subheading?: string
  ctaText?: string
  ctaLink?: string
  ordering?: 'featured' | 'newest' | 'popular' | 'discounted' | 'rating'
  categoryId?: number
  showAddToCart?: boolean
  pageSize?: number
  columns?: number
  surface?: 'default' | 'muted'
}>(), {
  ordering: 'featured',
  pageSize: 8,
  showAddToCart: true,
})

const effectivePageSize = computed(
  () => props.pageSize ?? (props.columns ? props.columns * 2 : 8),
)
</script>

<template>
  <PageSectionProductsSlider
    :title="title"
    :heading="heading"
    :subheading="subheading"
    :cta-text="ctaText"
    :cta-link="ctaLink"
    :ordering="ordering"
    :category-id="categoryId"
    :show-add-to-cart="showAddToCart"
    :page-size="effectivePageSize"
    :surface="surface"
  />
</template>
