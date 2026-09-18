<script lang="ts" setup>
/**
 * A rail of products, with a heading that says what it draws.
 *
 * `featured_products` renders the same band with a different default
 * ordering — the merchant's own arrangement rather than recency — which
 * is what makes two rails on one homepage two different bands.
 *
 * The whole band disappears when the query comes back empty. A heading
 * over nothing is what a brand-new store used to show.
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
  ordering: 'newest',
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

/** The operator's words first; otherwise one that fits the ordering. */
const label = computed(
  () => props.heading || props.title || t(`heading.${props.ordering}`),
)

const cta = computed(() => ({
  text: props.ctaText || t('all_products'),
  link: props.ctaLink ? localePath(props.ctaLink) : localePath('/products'),
}))
</script>

<template>
  <PageSectionBand
    v-if="hasProducts"
    :heading="label"
    :subheading="subheading"
    :cta-text="cta.text"
    :cta-link="cta.link"
    :surface="surface"
  >
    <ProductsRail
      :products="products"
      :show-add-to-cart="showAddToCart"
    />
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
