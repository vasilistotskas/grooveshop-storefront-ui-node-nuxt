<script lang="ts" setup>
/**
 * Products the recommendation engine pairs with this one, as a grid of
 * product cards: two across on a phone, four on a desktop.
 *
 * With `band`, the section is a full-width page band of its own (the
 * product page); without it, a plain section inside the caller's
 * container (the cart). The band is drawn only once there are products,
 * so a product the engine has nothing for leaves no empty band behind.
 */
const props = defineProps<{
  /**
   * Which slot the engine answers for. Selects the merchant's chain,
   * limit and minimum fill for this placement.
   */
  surface: SurfaceEnum
  /**
   * The product the shopper is looking at. Required unless ``items``
   * is passed.
   */
  seedId?: number
  /**
   * Already-computed suggestions — the cart payload carries its own,
   * seeded with the whole basket, so the cart page passes them here
   * instead of fetching a second time. No feedback events on this path.
   */
  items?: readonly Product[]
  /**
   * Override the slot's limit (capped at 12 by the API).
   */
  limit?: number
  /**
   * Hide the section heading where the surrounding layout already
   * gives the grid enough context.
   */
  hideTitle?: boolean
  /** Render as a full-width page band. */
  band?: boolean
}>()

const { t } = useI18n()

// SSR-rendered: Nitro caches this per (seed, surface) so the page
// pays a cache hit, not a Django round trip. Not fetched at all when
// the parent already has the items.
const fetches = props.items === undefined && typeof props.seedId === 'number'
// A plain template literal, as the product page does: Nitro's typed
// routes resolve the response type from it, which a URL function
// would not. The seed is fixed for the component's lifetime — the
// page remounts it per product.
const { data } = useApi(`/api/products/${props.seedId}/recommendations`, {
  key: `recommendations:${props.surface}:${props.seedId}:${props.limit ?? ''}`,
  query: {
    surface: props.surface,
    ...(typeof props.limit === 'number' ? { limit: props.limit } : {}),
  },
  immediate: fetches,
  default: () => null,
  // The grid is `hydrate-on-visible`: its setup runs after the app has
  // finished hydrating, when Nuxt's default no longer reads the payload
  // — so the server drew a full grid and the client started from
  // `null` (a hydration node mismatch on every product page). See
  // app/utils/payloadCachedData.ts.
  getCachedData: payloadCachedData,
})

const products = computed<readonly Product[]>(() => {
  if (props.items !== undefined) {
    return typeof props.limit === 'number' ? props.items.slice(0, props.limit) : props.items
  }
  return (data.value?.items ?? []).map(item => item.product)
})
const hasItems = computed(() => products.value.length > 0)
const title = computed(() => t(`title.${props.surface}`))
const titleId = `product-suggestions-${props.surface}`

// Feedback loop. The impression is reported from onMounted, which
// under ``hydrate-on-visible`` fires when the grid scrolls into view
// — "shown", not "served". The cart path has no impressionId and
// reports nothing. A click is any interaction with a card — the link,
// the photograph or "add to cart" — captured on the card.
const { trackImpression, trackClick } = useRecommendationTracking(props.surface, props.seedId)
onMounted(() => {
  const response = data.value
  if (response?.impressionId && response.items.length > 0) {
    trackImpression(response.impressionId, response.items)
  }
})
const onCardClick = (position: number) => {
  const impressionId = data.value?.impressionId
  const item = data.value?.items[position]
  if (impressionId && item) trackClick(impressionId, item, position)
}

/**
 * Resolved here rather than named as a string in `:is`: a string that is
 * not a native tag renders as an unknown element (see PageSection/Band).
 */
const root = computed(() => (props.band ? resolveComponent('PageSectionBand') : 'section'))
</script>

<template>
  <component
    :is="root"
    v-if="hasItems"
    :heading="band && !hideTitle ? title : undefined"
    :aria-labelledby="band || hideTitle ? undefined : titleId"
    :aria-label="hideTitle ? title : undefined"
    :class="!band && 'flex flex-col gap-5'"
  >
    <h2
      v-if="!band && !hideTitle"
      :id="titleId"
      class="font-display text-[1.625rem]/[1.1] font-bold tracking-[-0.02em] text-highlighted"
    >
      {{ title }}
    </h2>
    <UPageGrid
      as="ul"
      class="
        grid-cols-2 gap-3.5
        lg:grid-cols-4 lg:gap-6
      "
    >
      <ProductCard
        v-for="(product, index) in products"
        :key="product.id"
        :product="product"
        @click.capture="onCardClick(index)"
      />
    </UPageGrid>
  </component>
</template>

<i18n lang="yaml">
el:
  title:
    pdp: "Μπορεί να σου αρέσουν"
    cart: "Πρόσθεσε στην παραγγελία σου"
    out_of_stock: "Διαθέσιμες εναλλακτικές"
    empty_cart: "Δημοφιλή προϊόντα"
    order_email: "Μπορεί να σε ενδιαφέρουν"
en:
  title:
    pdp: "You may also like"
    cart: "Complete your order"
    out_of_stock: "Available alternatives"
    empty_cart: "Popular products"
    order_email: "You might be interested in"
</i18n>
