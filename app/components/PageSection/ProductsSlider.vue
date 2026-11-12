<script lang="ts" setup>
/**
 * A rail of products, with a heading that says what it draws.
 *
 * The products arrive read (`products`, a data setting the page route
 * resolved), with the rule or hand-picked list they came from: the order of a
 * rule is what makes two rails on one homepage two different bands, and it
 * names this one.
 *
 * The whole band disappears when the list comes back empty: its block
 * declares that, and a heading over nothing is what a brand-new store used
 * to show.
 *
 * A design with its own product card draws it through the `card` slot: the
 * band and the rail stay these ones.
 */
const props = withDefaults(defineProps<{
  heading?: string
  subheading?: string
  ctaText?: string
  ctaLink?: string
  showAddToCart?: boolean
  surface?: 'default' | 'muted'
  colorScheme?: SectionColorScheme
  /** What the band lists: the products, and the rule or hand-picked list they came from. */
  products: ResolvedQuery<ProductCard, DataDescriptor<'product'>>
}>(), {
  showAddToCart: true,
})

const slots = defineSlots<{
  card?(props: { product: ProductCard, showAddToCart: boolean }): unknown
}>()

const { t } = useStoreI18n('components/PageSection/ProductsSlider')
const localePath = useLocalePath()

const kind = computed(() => productRailKind(props.products.descriptor))

/** The operator's words first; otherwise one that fits what the band lists. */
const label = computed(
  () => props.heading || t(`heading.${kind.value}`),
)

/**
 * Where "see all" goes when the operator has not said: the listing sorted as
 * the rail is (`PRODUCT_LISTING_SORT`), and its link says so, which is what
 * tells three rails on one page apart. The orders with no listing sort open
 * the listing as it is, under the generic label. A rule that hides sold-out
 * products opens it filtered to what is in stock (`productRailStockQuery`).
 */
const cta = computed(() => {
  if (props.ctaText || props.ctaLink) {
    return {
      text: props.ctaText || t('all_products'),
      link: props.ctaLink ? localePath(pathLocation(props.ctaLink)) : localePath('products'),
    }
  }
  const sort = PRODUCT_LISTING_SORT[kind.value]
  const query = { ...(sort && { sort }), ...productRailStockQuery(props.products.descriptor) }
  return {
    text: sort ? t(`all.${kind.value}`) : t('all_products'),
    link: Object.keys(query).length ? localePath({ path: '/products', query }) : localePath('products'),
  }
})
</script>

<template>
  <PageSectionBand
    v-if="products.items.length"
    :heading="label"
    :subheading="subheading"
    :cta-text="cta.text"
    :cta-link="cta.link"
    :surface="surface"
    :color-scheme="colorScheme"
  >
    <ProductsRail
      :products="[...products.items]"
      :show-add-to-cart="showAddToCart"
    >
      <template
        v-if="slots.card"
        #card="card"
      >
        <slot
          name="card"
          v-bind="card"
        />
      </template>
    </ProductsRail>
  </PageSectionBand>
</template>

<i18n lang="yaml">
el:
  all_products: Όλα τα προϊόντα
  all:
    newest: Όλες οι νέες αφίξεις
    mostViewed: Όλα τα δημοφιλή
    mostLiked: Όλα τα αγαπημένα
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
  all:
    newest: All new arrivals
    mostViewed: All most popular
    mostLiked: All customer favourites
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
