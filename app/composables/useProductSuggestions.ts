/**
 * The recommendation engine's answer for a suggestion strip, and the
 * feedback loop that goes with it (`Product/Suggestions.vue` and the
 * tenants' own drawing of it).
 *
 * SSR-rendered: Nitro caches the answer per (seed, surface), so the page
 * pays a cache hit, not a Django round trip. A basket of seeds (`seedIds`:
 * the cart's product ids) is asked for when the strip is shown, not carried
 * by every cart read, and again whenever the basket changes; an empty basket
 * asks nothing. Call it from a `<script setup>`.
 */
export function useProductSuggestions(props: {
  /** Which slot the engine answers for. */
  surface: SurfaceEnum
  /** The product the shopper is looking at; absent, the store-wide answer. */
  seedId?: number
  limit?: number
  /** The basket the engine answers for, e.g. the cart's product ids. */
  seedIds?: readonly number[]
  /** Whether the strip asks at all (the cart drawer, while it is closed). */
  enabled?: boolean
}) {
  // The engine recommends catalogue products: none without the catalogue.
  const catalogueEnabled = useStoreFeature('catalogue')
  // A basket with nothing in it has no seed: Django refuses the surface.
  const fetches = computed(() =>
    catalogueEnabled.value
    && (props.enabled ?? true)
    && (props.seedIds === undefined || props.seedIds.length > 0))
  // Sorted, as the route keys its cache entry by the sorted seeds.
  const seeds = computed(() => props.seedIds
    ? [...props.seedIds].sort((a, b) => a - b).join(',')
    : undefined)
  // Plain template literals, as the product page does: Nitro's typed
  // routes resolve the response type from them, which a URL function
  // would not. The seed is fixed for the component's lifetime — the
  // page remounts it per product. No seed: the store-wide route.
  const url = typeof props.seedId === 'number'
    ? `/api/products/${props.seedId}/recommendations` as const
    : '/api/recommendations' as const
  const { data: served, refresh } = useApi(url, {
    key: `recommendations:${props.surface}:${props.seedId ?? 'store'}:${props.limit ?? ''}`,
    query: computed(() => ({
      surface: props.surface,
      ...(typeof props.limit === 'number' ? { limit: props.limit } : {}),
      ...(seeds.value ? { seeds: seeds.value } : {}),
    })),
    enabled: fetches,
    default: () => null,
    // The strip is `hydrate-on-visible`: its setup runs after the app has
    // finished hydrating, when Nuxt's default no longer reads the payload
    // — so the server drew a full strip and the client started from
    // `null` (a hydration node mismatch on every product page). See
    // app/utils/payloadCachedData.ts.
    getCachedData: payloadCachedData,
  })
  // `enabled` only blocks the runs it covers: it does not start one when it
  // turns true, so a basket that changed while the strip was switched off
  // (the closed cart drawer) is asked for when it is switched on.
  watch(fetches, (on) => {
    if (on) refresh()
  })
  // The route's response type comes from the generated Zod schema, where an
  // OpenAPI `NullEnum` is `unknown` (the TypeScript types have it as `never`);
  // the contract type is what the cards and the tracker are written against.
  const data = computed(() => served.value as ApiV1RecommendationsRetrieveResponse | null)

  // Feedback loop. The impression is reported once the strip is mounted
  // with items — for a server-rendered strip under ``hydrate-on-visible``,
  // when it scrolls into view: "shown", not "served". A click is any interaction with
  // a card — the link, the photograph or "add to cart" — captured on the
  // card.
  const { trackImpressionWhenShown, trackClick } = useRecommendationTracking(props.surface, props.seedId)
  trackImpressionWhenShown(data)
  const onCardClick = (position: number) => {
    const impressionId = data.value?.impressionId
    const item = data.value?.items[position]
    if (impressionId && item) trackClick(impressionId, item, position)
  }

  return { data, onCardClick }
}
