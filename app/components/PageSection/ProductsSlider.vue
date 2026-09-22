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

/**
 * Where "see all" goes when the operator has not said. The listing
 * sorts by the same Meilisearch fields the rail orders by (see the
 * allowlist in `Products/Toolbar.vue`), so a rail of new arrivals opens
 * the listing newest-first rather than in its default order — and its
 * link says so, which is what tells three rails on one page apart.
 * `discounted` and `rating` have no listing sort, so they open the
 * listing as it is, under the generic label.
 */
const LISTING_SORT: Partial<Record<ProductRailOrdering, string>> = {
  featured: '-viewCount',
  newest: '-createdAt',
  popular: '-likesCount',
}

const cta = computed(() => {
  if (props.ctaText || props.ctaLink) {
    return {
      text: props.ctaText || t('all_products'),
      link: props.ctaLink ? localePath(props.ctaLink) : localePath('/products'),
    }
  }
  const sort = LISTING_SORT[props.ordering]
  return sort
    ? {
        text: t(`all.${props.ordering}`),
        link: localePath({ path: '/products', query: { sort } }),
      }
    : { text: t('all_products'), link: localePath('/products') }
})
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
  all:
    featured: Όλα τα επιλεγμένα
    newest: Όλες οι νέες αφίξεις
    popular: Όλα τα δημοφιλή
  heading:
    featured: Επιλεγμένα προϊόντα
    newest: Νέες αφίξεις
    popular: Δημοφιλή
    discounted: Σε προσφορά
    rating: Κορυφαίες αξιολογήσεις
en:
  all_products: All products
  all:
    featured: All featured
    newest: All new arrivals
    popular: All popular
  heading:
    featured: Featured products
    newest: New arrivals
    popular: Most popular
    discounted: On offer
    rating: Top rated
</i18n>
