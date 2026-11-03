<script lang="ts" setup>
/**
 * Products as a grid rather than a rail.
 *
 * The same list as `products_slider` — a band the operator wants read
 * in one glance instead of swiped. The products arrive read (`products`,
 * a data setting the page route resolved), so the band fetches nothing and
 * draws the same on the server and in the browser.
 *
 * The whole band disappears when the list comes back empty: its block
 * declares that, and a heading over nothing is what a brand-new store used
 * to show.
 */
const props = withDefaults(defineProps<{
  /** The operator's section title; `heading` wins when both are set. */
  title?: string
  heading?: string
  subheading?: string
  ctaText?: string
  ctaLink?: string
  showAddToCart?: boolean
  surface?: 'default' | 'muted'
  /** What the band lists: the products, and the rule or hand-picked list they came from. */
  products: ResolvedQuery<ProductCard, DataDescriptor<'product'>>
}>(), {
  showAddToCart: true,
})

const { t } = useStoreI18n('components/PageSection/ProductsGrid')
const localePath = useLocalePath()

const label = computed(
  () => props.heading || props.title || t(`heading.${productRailKind(props.products.descriptor)}`),
)
</script>

<template>
  <PageSectionBand
    v-if="products.items.length"
    :heading="label"
    :subheading="subheading"
    :cta-text="ctaText || t('all_products')"
    :cta-link="ctaLink ? localePath(pathLocation(ctaLink)) : localePath('products')"
    :surface="surface"
  >
    <UPageGrid
      as="ul"
      class="
        grid-cols-2 gap-3.5
        lg:grid-cols-4 lg:gap-6
      "
    >
      <ProductCard
        v-for="product in products.items"
        :key="product.id"
        :product="product"
        :show-add-to-cart-button="showAddToCart"
      />
    </UPageGrid>
  </PageSectionBand>
</template>

<i18n lang="yaml">
el:
  all_products: Όλα τα προϊόντα
  heading:
    picked: Επιλεγμένα προϊόντα
    newest: Νέες αφίξεις
    mostViewed: Δημοφιλή
    mostLiked: Αγαπημένα
    topRated: Κορυφαίες αξιολογήσεις
    discounted: Σε προσφορά
    priceAsc: Οι καλύτερες τιμές
    priceDesc: Premium επιλογές
en:
  all_products: All products
  heading:
    picked: Selected products
    newest: New arrivals
    mostViewed: Most popular
    mostLiked: Customer favourites
    topRated: Top rated
    discounted: On offer
    priceAsc: Best prices
    priceDesc: Premium picks
</i18n>
