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
 *
 * A design with its own product card draws the list through the `list` slot:
 * the band stays this one, and the card keeps the columns it was laid out for.
 */
const props = withDefaults(defineProps<{
  eyebrow?: string
  heading?: string
  subheading?: string
  ctaText?: string
  ctaLink?: string
  showAddToCart?: boolean
  surface?: 'default' | 'muted'
  colorScheme?: SectionColorScheme
  /** How many of the products a phone shows, the first ones; all of them when unset. */
  phoneLimit?: number
  /** The categories a last tile of the grid lists, on a desk (`PageSection/ProductsCategoryTile`). */
  categories?: ResolvedQuery<ProductCategory, DataDescriptor<'category'>>
  /** The band's bold look (`PageSection/BandBold`): on a phone its link is a button under the grid. */
  look?: 'bold'
  /** What the band lists: the products, and the rule or hand-picked list they came from. */
  products: ResolvedQuery<ProductCard, DataDescriptor<'product'>>
}>(), {
  showAddToCart: true,
})

defineSlots<{
  list?(props: {
    items: readonly ProductCard[]
    showAddToCart: boolean
    /** The attribute that hides the product at an index past the phone's limit (`main.css`). */
    phoneHidden: (index: number) => Record<string, string>
    categories: readonly ProductCategory[]
  }): unknown
}>()

const { t } = useStoreI18n('components/PageSection/ProductsGrid')
const localePath = useLocalePath()
const linkTo = useLinkTo()

/** The attribute that hides a product past the phone's limit below `sm` (`main.css`); none within it. */
const phoneHidden = (index: number): Record<string, string> => (props.phoneLimit !== undefined && index >= props.phoneLimit ? { 'data-phone-hidden': '' } : {})

const categoryItems = computed(() => props.categories?.items ?? [])

const label = computed(
  () => props.heading || t(`heading.${productRailKind(props.products.descriptor)}`),
)
</script>

<template>
  <PageSectionBand
    v-if="products.items.length"
    :eyebrow="eyebrow"
    :heading="label"
    :subheading="subheading"
    :cta-text="ctaText || t('all_products')"
    :cta-link="ctaLink ? linkTo(ctaLink) : localePath({ path: '/products', query: productRailStockQuery(products.descriptor) })"
    :surface="surface"
    :color-scheme="colorScheme"
    :look="look"
    :phone-cta="look === 'bold' ? 'below' : undefined"
  >
    <slot
      name="list"
      :items="products.items"
      :show-add-to-cart="showAddToCart"
      :phone-hidden="phoneHidden"
      :categories="categoryItems"
    >
      <!-- The grid closes with the categories' tile when the band lists
           them; otherwise it is the grid as it always was. -->
      <UPageGrid
        v-if="categoryItems.length"
        as="ul"
        class="
          grid-cols-2 gap-3.5
          lg:grid-cols-4 lg:gap-6
        "
      >
        <ProductCard
          v-for="(product, index) in products.items"
          :key="product.id"
          v-bind="phoneHidden(index)"
          :product="product"
          :show-add-to-cart-button="showAddToCart"
        />
        <PageSectionProductsCategoryTile :categories="categoryItems" />
      </UPageGrid>
      <UPageGrid
        v-else
        as="ul"
        class="
          grid-cols-2 gap-3.5
          lg:grid-cols-4 lg:gap-6
        "
      >
        <ProductCard
          v-for="(product, index) in products.items"
          :key="product.id"
          v-bind="phoneHidden(index)"
          :product="product"
          :show-add-to-cart-button="showAddToCart"
        />
      </UPageGrid>
    </slot>
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
