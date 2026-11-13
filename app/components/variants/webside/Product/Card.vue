<script lang="ts" setup>
import type { PropType } from 'vue'

/**
 * webside's product card, as its design board draws it: a bordered tile with
 * the square photograph on a light tile, its stock as a pill over the
 * photograph's corner and the heart as a round button in the other, the name,
 * the rating where there is one, and ONE row with the price and the way to
 * buy (the add-to-cart button, or the restock alert when it is sold out).
 *
 * In a phone's narrow column (the card's container, which exists below `sm`
 * only) it is compact: no border, the pill at the photograph's foot, a
 * smaller name and price, and the buy button as its icon alone, 44px square,
 * its label kept for a screen reader.
 */
const { productUrl } = useUrls()
const { t, locale } = useStoreI18n('components/variants/webside/Product/Card')
// Off, reviews are gone everywhere — the stars on a card with them.
const productReviewsEnabled = useStoreFeature('productReviews')
const productAlertsEnabled = useStoreFeature('productAlerts')

const props = defineProps({
  product: { type: Object as PropType<Product | ProductCard>, required: true },
  /**
   * The element the card renders as: `li` inside the `<ul>`/`<ol>` of a
   * listing, `div` on a slide of a rail, which is no list.
   */
  as: { type: String, required: false, default: 'li' },
  showAddToFavouriteButton: { type: Boolean, required: false, default: true },
  showAddToCartButton: { type: Boolean, required: false, default: true },
  imgWidth: { type: Number, required: false, default: 420 },
  imgHeight: { type: Number, required: false, default: 420 },
  imgLoading: {
    type: String as PropType<ImageLoading>,
    required: false,
    default: undefined,
    validator: (value: string) => ['lazy', 'eager'].includes(value),
  },
  /**
   * The first card of a listing is the page's LCP: its photograph is
   * preloaded and fetched at high priority. `preload` also sets the
   * priority of the preload link; the `<img>` takes `imgFetchPriority`.
   */
  imgFetchPriority: {
    type: String as PropType<'high' | 'low' | 'auto'>,
    required: false,
    default: undefined,
  },
  preload: { type: Boolean, required: false, default: false },
})

const emit = defineEmits<{
  (e: 'favourite-delete'): void
}>()

const { $i18n } = useNuxtApp()
const { user } = useUserSession()
const userStore = useUserStore()
const { getFavouriteIdByProductId } = userStore

const { product } = toRefs(props)

// Get the correct product ID for URLs and API calls
// For search results (ProductMeiliSearchResult), use 'master' field
// For regular Product objects, use 'id' field
const productId = computed(() => {
  if ('master' in product.value && typeof product.value.master === 'number') {
    return product.value.master
  }
  return product.value.id
})

const productName = computed(() => {
  if (!product.value) return undefined
  if ('name' in product.value && typeof product.value.name === 'string') {
    return product.value.name
  }
  return extractTranslated(product.value, 'name', locale.value)
})

const alt = computed(() => productName.value)

const soldOut = computed(() => product.value.stock === 0)
const isLowStock = computed(() => lowStockLeft(product.value) !== null)

// Wholesale price hydration — client-only, retail renders first then
// swaps (the cached/anonymous catalogue HTML must never carry a
// per-customer price; see useB2BPricing).
const { register: registerB2BPrice, priceFor: b2bPriceFor } = useB2BPricing()
onMounted(() => {
  registerB2BPrice(productId.value)
})
const b2bPrice = computed(() => b2bPriceFor(productId.value))
const isWholesalePrice = computed(() =>
  !!b2bPrice.value
  && Number(b2bPrice.value.finalPrice) < productCurrentPrice(product.value),
)
const displayFinalPrice = computed(() =>
  isWholesalePrice.value && b2bPrice.value
    ? Number(b2bPrice.value.finalPrice)
    : productCurrentPrice(product.value),
)
// The struck-through price (see productWasPrice) and the reduction a
// consumer may be told about: none under a wholesale price.
const wasPrice = computed(() => productWasPrice(product.value, displayFinalPrice.value))
const announcement = computed(() => isWholesalePrice.value ? undefined : productAnnouncement(product.value))

const favouriteId = computed(
  () => getFavouriteIdByProductId(productId.value),
)

const onFavouriteDelete = () => emit('favourite-delete')
</script>

<template>
  <component
    :is="as"
    class="
      product-card group relative w-full max-w-full
      max-sm:@container/card
    "
  >
    <div
      class="
        flex size-full flex-col gap-3 rounded-lg border border-neutral-200
        bg-white px-2.5 pt-2.5 pb-3.5 transition-colors
        focus-within:ring-1 focus-within:ring-primary
        hover:border-neutral-300
        @max-3xs/card:gap-2 @max-3xs/card:rounded-none @max-3xs/card:border-0
        @max-3xs/card:bg-transparent @max-3xs/card:p-0
        dark:border-neutral-800 dark:bg-neutral-900
        dark:hover:border-neutral-700
        @max-3xs/card:dark:bg-transparent
      "
    >
      <div
        class="
          relative aspect-square overflow-hidden rounded-md bg-neutral-100
          @max-3xs/card:rounded-lg
        "
      >
        <NuxtLink
          :to="{ path: productUrl(productId, product.slug) }"
          :aria-label="`${t('view_product')}: ${alt}`"
          class="block size-full"
        >
          <ImgWithFallback
            :loading="imgLoading"
            :fetchpriority="imgFetchPriority"
            :preload="preload"
            class="size-full object-cover"
            :class="{
              // Dim out-of-stock products so browsing scannability
              // reflects availability, not just the pill.
              'opacity-60 grayscale': soldOut,
            }"
            :src="product.mainImagePath"
            :width="imgWidth"
            :height="imgHeight"
            fit="cover"
            :alt="alt"
            densities="x1"
          />
        </NuxtLink>

        <!-- The pills sit at the photograph's top corner, and at its foot
             in a phone's narrow card, where the heart takes the top. A pill
             that does not fit wraps rather than being cut. -->
        <div
          class="
            pointer-events-none absolute top-2 left-2 flex flex-col items-start
            gap-1.5
            @max-3xs/card:top-auto @max-3xs/card:bottom-1.5
            @max-3xs/card:left-1.5 @max-3xs/card:gap-1
          "
        >
          <UBadge
            v-if="announcement"
            color="error"
            variant="soft"
            size="lg"
            class="w-fit rounded-full font-bold"
          >
            -{{ announcement.percent }}%
          </UBadge>
          <span
            v-if="soldOut"
            class="
              inline-flex min-h-6.5 items-center rounded-full bg-neutral-900
              px-2.5 text-xs font-bold text-white
              @max-3xs/card:min-h-6 @max-3xs/card:px-2
              @max-3xs/card:text-[0.6875rem]
              @max-[8.625rem]/card:px-1.5 @max-[8.625rem]/card:text-[10px]
            "
          >
            {{ t('out_of_stock') }}
          </span>
          <span
            v-else-if="isLowStock"
            class="
              inline-flex min-h-6.5 items-center rounded-full bg-yellow-50
              px-2.5 text-xs font-bold text-yellow-700
              @max-3xs/card:min-h-6 @max-3xs/card:px-2
              @max-3xs/card:text-[0.6875rem]
              @max-[8.625rem]/card:px-1.5 @max-[8.625rem]/card:text-[10px]
            "
          >
            {{ t('only_n_left', { count: product.stock }) }}
          </span>
        </div>

        <!-- A round 44px button, and in a phone's narrow card a 32px one
             with a 44px hit area (WCAG 2.5.8): the ::after pads the
             target, not the glyph. -->
        <LazyWebsideButtonProductAddToFavourite
          v-if="showAddToFavouriteButton"
          :product-id="productId"
          :product-name="productName ?? ''"
          :user-id="user?.id"
          :favourite-id="favouriteId"
          size="lg"
          class="
            absolute top-1.5 right-1.5 size-11 justify-center rounded-full
            bg-white/90 text-neutral-900
            after:absolute after:-inset-1.5
            hover:bg-white
            @max-3xs/card:top-2 @max-3xs/card:right-2 @max-3xs/card:size-8
          "
          @favourite-delete="onFavouriteDelete"
        />
      </div>

      <div
        class="
          flex flex-1 flex-col gap-1 px-1
          @max-3xs/card:px-0
        "
      >
        <NuxtLink
          :to="{ path: productUrl(productId, product.slug) }"
          class="group/link"
          :aria-label="`${t('view_product')}: ${productName}`"
        >
          <h3
            class="
              line-clamp-2 text-base/[1.35] font-semibold wrap-anywhere
              text-neutral-900 transition-colors
              group-hover/link:text-accent
              @max-3xs/card:text-sm/[1.3]
              dark:text-white
            "
          >
            {{ productName }}
          </h3>
        </NuxtLink>

        <ProductRating
          v-if="productReviewsEnabled && product.reviewCount"
          :average="product.reviewAverage"
          :count="product.reviewCount"
          class="@max-3xs/card:hidden"
        />
      </div>

      <!-- ONE row: the price, and the way to buy beside it. In a narrow
           card the price keeps its own width (a price is one unbreakable
           word, «783,66 €»), so a price too long to sit beside the 44px
           button sends the button to a line of its own (`flex-wrap`);
           below a 138px card (8.625rem) the button always does. -->
      <div
        class="
          mt-auto flex flex-wrap items-center justify-between gap-x-2.5 gap-y-2
          px-1
          @max-3xs/card:gap-x-1.5 @max-3xs/card:px-0
        "
      >
        <div
          class="
            flex flex-col
            @max-[8.625rem]/card:basis-full
          "
        >
          <ProductPriorPrice
            v-if="announcement"
            :price="announcement.priorPrice"
            class="
              text-xs text-neutral-700
              dark:text-neutral-300
            "
          />
          <span
            v-else-if="isWholesalePrice && wasPrice"
            class="
              text-xs text-neutral-700 line-through
              dark:text-neutral-300
            "
          >
            {{ $i18n.n(wasPrice, 'currency') }}
          </span>
          <span
            class="
              text-xl font-extrabold whitespace-nowrap text-neutral-900
              tabular-nums
              @max-3xs/card:text-[1.0625rem]
              dark:text-white
            "
          >
            {{ $i18n.n(displayFinalPrice, 'currency') }}
          </span>
        </div>

        <LazyWebsideProductNotifyMe
          v-if="soldOut && productAlertsEnabled"
          :product-id="productId"
          kind="restock"
          class="
            min-w-0
            @max-[8.625rem]/card:w-full
          "
        />
        <LazyWebsideButtonProductAddToCart
          v-else-if="showAddToCartButton && !soldOut"
          :product="product"
          :quantity="1"
          :text="`${t('add_to_cart')}: ${productName}`"
          :label="t('add_to_cart')"
          size="lg"
          class="
            ml-auto min-h-11 w-auto shrink-0 px-3.5 text-sm font-semibold
            @max-3xs/card:size-11 @max-3xs/card:p-0
            @max-3xs/card:*:data-[slot=label]:sr-only
            @max-[8.625rem]/card:w-full
          "
        />
      </div>
    </div>
  </component>
</template>

<i18n lang="yaml">
el:
  add_to_cart: Στο καλάθι
  out_of_stock: Εξαντλήθηκε
  only_n_left: Μόνο {count} απέμεινε | Μόνο {count} απέμειναν
  view_product: Προβολή προϊόντος
en:
  add_to_cart: Add to cart
  out_of_stock: Sold out
  only_n_left: Only {count} left | Only {count} left
  view_product: View product
</i18n>

<style scoped>
/**
 * Reduced motion support for Product Card
 * Disables transitions for users who prefer reduced motion
 */
@media (prefers-reduced-motion: reduce) {
  :deep(.transition-colors),
  .transition-colors {
    transition: none;
  }
}
</style>
