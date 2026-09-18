<script lang="ts" setup>
/**
 * Products as a grid rather than a rail.
 *
 * The same query as `products_slider` — a band the operator wants read
 * in one glance instead of swiped. It used to mount the full `/products`
 * listing component, toolbar, filters, pagination and all, which fetched
 * a second product page mid-homepage and put a sort control on a page
 * that had nothing to sort.
 */
const props = withDefaults(defineProps<{
  /** The operator's section title; `heading` wins when both are set. */
  title?: string
  heading?: string
  subheading?: string
  ctaText?: string
  ctaLink?: string
  ordering?: ProductRailOrdering
  categoryId?: number
  showAddToCart?: boolean
  pageSize?: number
  surface?: 'default' | 'muted'
}>(), {
  ordering: 'featured',
  pageSize: 8,
  showAddToCart: true,
})

const { t } = useI18n()
const localePath = useLocalePath()

const { products, hasProducts } = await useProductRail({
  pageSize: () => props.pageSize,
  ordering: () => props.ordering,
  categoryId: () => props.categoryId,
})

const label = computed(
  () => props.heading || props.title || t(`heading.${props.ordering}`),
)
</script>

<template>
  <PageSectionBand
    v-if="hasProducts"
    :heading="label"
    :subheading="subheading"
    :cta-text="ctaText || t('all_products')"
    :cta-link="ctaLink ? localePath(ctaLink) : localePath('/products')"
    :surface="surface"
  >
    <UPageGrid
      class="
        grid-cols-2
        lg:grid-cols-4
      "
    >
      <ProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
        :show-add-to-cart-button="showAddToCart"
        :img-width="420"
        :img-height="420"
      />
    </UPageGrid>
  </PageSectionBand>
</template>

<i18n lang="yaml">
el:
  all_products: Όλα τα προϊόντα
  heading:
    featured: Επιλεγμένα προϊόντα
    newest: Νέες αφίξεις
    popular: Δημοφιλή
    discounted: Σε προσφορά
    rating: Κορυφαίες αξιολογήσεις
en:
  all_products: All products
  heading:
    featured: Featured products
    newest: New arrivals
    popular: Most popular
    discounted: On offer
    rating: Top rated
</i18n>
