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
   * feedback events on this path.
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

const { t, locale } = useI18n()
const { productUrl } = useUrls()
const { $i18n } = useNuxtApp()
const { user } = useUserSession()
const { getFavouriteIdByProductId } = useUserStore()

type Tile = { product: Product, reason: RecommendationReason | null }

// `Product.name` lives under `translations.<locale>`, as on every
// parler model — the same reader as Product/Card.
const productName = (product: Product) =>
  extractTranslated(product, 'name', locale.value) ?? ''

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

// Wholesale price hydration — the same client-only swap as
// Product/Card; the cached, anonymous HTML never carries a
// per-customer price.
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
const isDiscounted = (product: Product) =>
  product.price > product.finalPrice || displayPrice(product) < product.finalPrice
const listPrice = (product: Product) =>
  displayPrice(product) < product.finalPrice ? product.finalPrice : product.price

// Feedback loop. The impression is reported from onMounted, which
// under ``hydrate-on-visible`` fires when the strip scrolls into view
// — "shown", not "served". The cart path has no impressionId and
// reports nothing. A click is any interaction with the tile — the
// link, the image or "add to cart" — captured on the wrapper.
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

// Two tiles per view on a phone (as the catalogue grid), three on a
// tablet, four on desktop, with a peek of the next; arrows only where
// there is a pointer, drawn inside the viewport so the page's content
// frame is never overrun. One mobile-first config — no user-agent
// branching, so the layout stays right in device emulation where the
// UA says "desktop" at 375px.
const carouselUI = {
  root: 'w-full max-w-full',
  viewport: 'overflow-hidden w-full',
  container: 'flex w-full items-stretch',
  item: `
    min-w-0 shrink-0 grow-0 basis-1/2 h-full
    md:basis-1/3
    lg:basis-1/4
  `,
  prev: 'hidden md:inline-flex start-2 sm:start-2',
  next: 'hidden md:inline-flex end-2 sm:end-2',
}
const arrowButton = {
  color: 'neutral',
  variant: 'solid',
  size: 'lg',
  square: true,
} as const
</script>

<template>
  <section
    v-if="hasItems"
    :aria-labelledby="hideTitle ? undefined : titleId"
    :aria-label="hideTitle ? t(`title.${surface}`) : undefined"
    class="w-full max-w-full space-y-4"
  >
    <header v-if="!hideTitle" class="flex items-center justify-between gap-3">
      <h2
        :id="titleId"
        class="
          text-2xl font-bold text-neutral-950
          dark:text-neutral-50
        "
      >
        {{ t(`title.${surface}`) }}
      </h2>
    </header>

    <LazyUCarousel
      v-slot="{ item, index }"
      :items="tiles"
      :ui="carouselUI"
      arrows
      :prev="arrowButton"
      :next="arrowButton"
      align="start"
      contain-scroll="trimSnaps"
      class="w-full max-w-full"
    >
      <article
        class="group flex h-full flex-col gap-2"
        @click.capture="onTileClick(item, index)"
      >
        <div
          class="
            relative aspect-square overflow-hidden rounded-xl bg-neutral-100
            dark:bg-neutral-800
          "
        >
          <NuxtLinkLocale
            :to="{ path: productUrl(item.product.id, item.product.slug) }"
            :aria-label="`${t('view_product')}: ${productName(item.product)}`"
            class="block size-full"
          >
            <ImgWithFallback
              :src="item.product.mainImagePath || undefined"
              :alt="productName(item.product)"
              :width="320"
              :height="320"
              fit="contain"
              :background="'transparent'"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 260px"
              loading="lazy"
              class="
                size-full object-contain transition-transform duration-200
                group-hover:scale-105
              "
            />
          </NuxtLinkLocale>
          <div class="absolute top-2 right-2">
            <LazyButtonProductAddToFavourite
              :product-id="item.product.id"
              :user-id="user?.id"
              :favourite-id="getFavouriteIdByProductId(item.product.id)"
              size="sm"
            />
          </div>
          <div class="absolute right-0 bottom-0">
            <LazyButtonProductAddToCart
              :product="item.product"
              :quantity="1"
              :text="t('add_to_cart')"
              icon-only
            />
          </div>
        </div>

        <p
          v-if="item.reason"
          class="
            text-xs text-neutral-600
            dark:text-neutral-400
          "
        >
          {{ reasonLabel(item.reason) }}
        </p>

        <NuxtLinkLocale
          :to="{ path: productUrl(item.product.id, item.product.slug) }"
          class="group/link"
        >
          <h3
            class="
              line-clamp-2 text-sm leading-snug font-semibold text-neutral-950
              transition-colors
              group-hover/link:text-primary-600
              dark:text-neutral-50 dark:group-hover/link:text-primary-400
            "
          >
            {{ productName(item.product) }}
          </h3>
        </NuxtLinkLocale>

        <div
          v-if="item.product.reviewAverage > 0"
          class="flex items-center gap-1"
        >
          <UIcon
            v-for="star in 5"
            :key="star"
            :name="star <= Math.round(item.product.reviewAverage / 2) ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
            class="size-3.5 text-warning"
          />
          <span
            v-if="item.product.reviewCount"
            class="
              text-xs text-neutral-600
              dark:text-neutral-400
            "
          >
            ({{ item.product.reviewCount }})
          </span>
        </div>

        <div class="mt-auto flex items-baseline gap-2">
          <span
            v-if="isDiscounted(item.product)"
            class="
              text-xs text-neutral-600 line-through
              dark:text-neutral-400
            "
          >
            {{ $i18n.n(listPrice(item.product), 'currency') }}
          </span>
          <span
            class="
              text-base font-bold text-neutral-950
              dark:text-neutral-50
            "
          >
            {{ $i18n.n(displayPrice(item.product), 'currency') }}
          </span>
        </div>
      </article>
    </LazyUCarousel>
  </section>
</template>

<i18n lang="yaml">
el:
  add_to_cart: "Προσθήκη στο καλάθι"
  view_product: "Προβολή προϊόντος"
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
  add_to_cart: "Add to cart"
  view_product: "View product"
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
