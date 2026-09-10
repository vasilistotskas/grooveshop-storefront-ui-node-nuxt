<script lang="ts" setup>
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
   * instead of fetching a second time. No reason labels and no
   * feedback events on this path (Step 2 of the engine wires attach).
   */
  items?: readonly Product[]
  /**
   * Override the slot's limit (capped at 12 by the API).
   */
  limit?: number
  /**
   * Hide the section heading where the surrounding layout already
   * gives the strip enough context.
   */
  hideTitle?: boolean
}>()

const { t } = useI18n()
const { productUrl } = useUrls()
const { $i18n } = useNuxtApp()

type Tile = { product: Product, reason: RecommendationReason | null }

// SSR-rendered: Nitro caches this per (seed, surface) so the page
// pays a cache hit, not a Django round trip. Not fetched at all when
// the parent already has the items.
const fetches = props.items === undefined && typeof props.seedId === 'number'
// A plain template literal, as the product page does: Nitro's typed
// routes resolve the response type from it, which a URL function
// would not. The seed is fixed for the component's lifetime — the
// page remounts it per product.
const { data } = useFetch(`/api/products/${props.seedId}/recommendations`, {
  key: `recommendations:${props.surface}:${props.seedId}:${props.limit ?? ''}`,
  query: {
    surface: props.surface,
    ...(typeof props.limit === 'number' ? { limit: props.limit } : {}),
  },
  immediate: fetches,
  default: () => null,
})

const tiles = computed<Tile[]>(() => {
  if (props.items !== undefined) {
    const own = typeof props.limit === 'number' ? props.items.slice(0, props.limit) : props.items
    return own.map(product => ({ product, reason: null }))
  }
  return (data.value?.items ?? []).map(item => ({ product: item.product, reason: item.reason }))
})
const hasItems = computed(() => tiles.value.length > 0)
const titleId = `product-suggestions-${props.surface}`

// The relation type is the more specific label when a merchant set
// one ("Goes well with"); otherwise the strategy that produced it.
// Keyed by enum, never free text, so the storefront owns the wording.
const reasonLabel = (reason: RecommendationReason) =>
  reason.relationType
    ? t(`relation.${reason.relationType}`)
    : t(`strategy.${reason.strategy}`)

// Wholesale price hydration — same client-only swap as Product/Card.
const { register: registerB2BPrice, priceFor: b2bPriceFor } = useB2BPricing()
watch(tiles, (items) => {
  registerB2BPrice(items.map(tile => tile.product.id))
}, { immediate: true })
const displayPrice = (product: Product) => {
  const b2b = b2bPriceFor(product.id)
  return b2b && Number(b2b.finalPrice) < product.finalPrice
    ? Number(b2b.finalPrice)
    : product.finalPrice
}

// Feedback loop. The impression is reported from onMounted, which
// under ``hydrate-on-visible`` fires when the strip scrolls into view
// — "shown", not "served". The cart path has no impressionId and
// reports nothing.
const { trackImpression, trackClick } = useRecommendationTracking(props.surface, props.seedId)
onMounted(() => {
  const response = data.value
  if (response?.impressionId && response.items.length > 0) {
    trackImpression(response.impressionId, response.items)
  }
})
const onTileClick = (tile: Tile, position: number) => {
  const impressionId = data.value?.impressionId
  if (impressionId && tile.reason) {
    trackClick(impressionId, { product: tile.product, reason: tile.reason }, position)
  }
}

// Single mobile-first UI config, shared with Product/RecentlyViewed:
// responsive slide widths (2 / 3 / 5 visible) and a viewport that can
// never overrun its parent.
const carouselUI = {
  root: 'w-full max-w-full',
  viewport: 'overflow-hidden w-full',
  container: 'flex w-full',
  item: `
    min-w-0 shrink-0 grow-0 basis-1/2
    md:basis-1/3
    lg:basis-1/5
  `,
}
</script>

<template>
  <section
    v-if="hasItems"
    :aria-labelledby="hideTitle ? undefined : titleId"
    :aria-label="hideTitle ? t(`title.${surface}`) : undefined"
    class="w-full max-w-full space-y-4 overflow-hidden"
  >
    <header v-if="!hideTitle" class="flex items-center justify-between gap-3">
      <h2
        :id="titleId"
        class="
          text-xl font-semibold text-primary-950
          dark:text-primary-50
        "
      >
        {{ t(`title.${surface}`) }}
      </h2>
    </header>

    <LazyUCarousel
      v-slot="{ item, index }"
      :items="tiles"
      :ui="carouselUI"
      :arrows="false"
      align="start"
      drag-free
      contain-scroll="trimSnaps"
      class="
        w-full max-w-full
        md:mx-auto
      "
    >
      <NuxtLinkLocale
        :to="{ path: productUrl(item.product.id, item.product.slug) }"
        class="
          group flex h-full flex-col gap-2 rounded-lg border border-neutral-200
          bg-white p-3 transition-shadow
          hover:shadow-md
          focus-visible:outline-2 focus-visible:outline-primary-500
          dark:border-neutral-800 dark:bg-neutral-900
        "
        @click="onTileClick(item, index)"
      >
        <div class="relative aspect-square overflow-hidden rounded-md bg-neutral-50 dark:bg-neutral-800">
          <ImgWithFallback
            :src="item.product.mainImagePath || undefined"
            :alt="item.product.name"
            :width="280"
            :height="280"
            fit="contain"
            :background="'ffffff'"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
            loading="lazy"
            class="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
          />
        </div>
        <p
          class="
            line-clamp-2 text-sm font-medium text-primary-950
            dark:text-primary-50
          "
        >
          {{ item.product.name }}
        </p>
        <UBadge
          v-if="item.reason"
          variant="soft"
          color="neutral"
          size="xs"
          class="self-start"
        >
          {{ reasonLabel(item.reason) }}
        </UBadge>
        <p
          v-if="item.product.finalPrice != null"
          class="mt-auto text-sm font-semibold text-secondary-600 dark:text-secondary-400"
        >
          {{ $i18n.n(displayPrice(item.product), 'currency') }}
        </p>
      </NuxtLinkLocale>
    </LazyUCarousel>
  </section>
</template>

<i18n lang="yaml">
el:
  title:
    pdp: "Μπορεί να σου αρέσουν"
    cart: "Πρόσθεσε στην παραγγελία σου"
    out_of_stock: "Διαθέσιμες εναλλακτικές"
    empty_cart: "Δημοφιλή προϊόντα"
    order_email: "Μπορεί να σε ενδιαφέρουν"
  relation:
    similar: "Παρόμοιο"
    complementary: "Ταιριάζει με"
    accessory: "Αξεσουάρ"
    replacement: "Αντικατάσταση"
    bundle: "Πακέτο"
  strategy:
    curated: "Επιλογή του καταστήματος"
    variant_group: "Άλλη παραλλαγή"
    category: "Ίδια κατηγορία"
    attributes: "Παρόμοια χαρακτηριστικά"
    semantic: "Παρόμοιο"
    co_purchase: "Αγοράζονται μαζί"
    co_view: "Είδαν επίσης"
    popular: "Δημοφιλές"
en:
  title:
    pdp: "You may also like"
    cart: "Complete your order"
    out_of_stock: "Available alternatives"
    empty_cart: "Popular products"
    order_email: "You might be interested in"
  relation:
    similar: "Similar"
    complementary: "Goes well with"
    accessory: "Accessory"
    replacement: "Replacement"
    bundle: "Bundle"
  strategy:
    curated: "Store pick"
    variant_group: "Another variant"
    category: "Same category"
    attributes: "Similar features"
    semantic: "Similar"
    co_purchase: "Bought together"
    co_view: "Also viewed"
    popular: "Popular"
</i18n>
