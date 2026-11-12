<script lang="ts" setup>
/**
 * One product, picked out on its own: the photograph on a square tile
 * beside its name, rating, stock, price and the way to buy it. The hero
 * that sells one product (`hero_showcase`) draws it; anything else that
 * spotlights a single product can.
 *
 * Every piece is the product card's (`Product/Card`): the product page
 * link, `ProductRating` (with reviews on), the shopper's price with an
 * announced reduction's prior price, `lowStockLeft` and the sold-out
 * state. The add-to-cart button and the restock alert are the STORE'S
 * own: a design draws them its own way, so they come from
 * `resolvePart` (`app/utils/variantRegistry.ts`), and this component
 * is the same in every design. A sold-out product offers the restock
 * alert (alerts on) instead of the button.
 */
const props = withDefaults(defineProps<{
  product: ProductCard
  /** The buy button; the store's `cart` feature decides too. */
  showAddToCart?: boolean
}>(), {
  showAddToCart: true,
})

const { t, locale } = useStoreI18n('components/Product/Spotlight')
const { $i18n } = useNuxtApp()
const localePath = useLocalePath()
const { productUrl } = useUrls()
const tenantStore = useTenantStore()
const cartEnabled = useStoreFeature('cart')
const productReviewsEnabled = useStoreFeature('productReviews')
const productAlertsEnabled = useStoreFeature('productAlerts')

const { product } = toRefs(props)
const productId = computed(() => product.value.id)

const { displayFinalPrice, wasPrice, announcement } = useShopperPrice(productId, product)

const name = computed(() => extractTranslated(product.value, 'name', locale.value) ?? '')
const to = computed(() => localePath({ path: productUrl(product.value.id, product.value.slug) }))
const soldOut = computed(() => (product.value.stock ?? 0) <= 0)
const lowStockCount = computed(() => lowStockLeft(product.value))

const partInput = computed<DesignPartInput>(() => ({
  product: product.value,
  name: name.value,
  addToCartLabel: t('add_to_cart'),
  addToCartName: t('add_named', { name: name.value }),
}))

const buy = computed(() => {
  if (soldOut.value) {
    return productAlertsEnabled.value ? resolvePart('product_restock_alert', tenantStore.schemaName) : null
  }
  return cartEnabled.value && props.showAddToCart ? resolvePart('product_add_to_cart', tenantStore.schemaName) : null
})
</script>

<template>
  <article
    class="
      relative flex overflow-hidden rounded-lg border border-default bg-default
    "
  >
    <div
      class="
        w-34 shrink-0 bg-elevated
        sm:w-42
      "
    >
      <!-- Not a link of its own: the name's stretched link covers the
           whole card, and a second one here would be a second tab stop
           to the same page. -->
      <ImgWithFallback
        :src="product.mainImagePath"
        :alt="name"
        :width="336"
        :height="336"
        fit="cover"
        loading="lazy"
        densities="x1 x2"
        sizes="xs:136px sm:168px"
        class="size-full object-cover"
        :class="soldOut && 'opacity-60 grayscale'"
      />
    </div>

    <div
      class="
        flex min-w-0 flex-1 flex-col gap-1.5 p-3.5
        sm:p-5
      "
    >
      <h2
        class="
          line-clamp-2 text-[0.9375rem]/snug font-bold text-pretty
          wrap-break-word
          sm:text-lg/snug
        "
      >
        <NuxtLink
          :to="to"
          class="
            text-highlighted
            after:absolute after:inset-0
            hover:text-accent
            focus-visible:outline-2 focus-visible:outline-secondary
          "
        >
          {{ name }}
        </NuxtLink>
      </h2>

      <ProductRating
        v-if="productReviewsEnabled"
        :average="product.reviewAverage"
        :count="product.reviewCount"
      />

      <!-- The words in the reading colours, the state in the dot: a
           status colour as 12px type misses AA on a light ground. -->
      <p class="flex items-center gap-1.5 text-xs font-semibold text-toned">
        <span
          aria-hidden="true"
          class="size-2 shrink-0 rounded-full"
          :class="soldOut ? 'bg-accented' : lowStockCount ? 'bg-warning' : `
            bg-success
          `"
        />
        <template v-if="soldOut">
          {{ t('sold_out') }}
        </template>
        <template v-else-if="lowStockCount">
          {{ t('only_n_left', { count: lowStockCount }, lowStockCount) }}
        </template>
        <template v-else>
          {{ t('in_stock') }}
        </template>
      </p>

      <div
        class="
          mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2
          pt-1.5
        "
      >
        <div class="flex flex-wrap items-baseline gap-x-2">
          <span
            class="
              font-mono text-xl font-bold text-highlighted tabular-nums
              sm:text-2xl
            "
          >
            {{ $i18n.n(displayFinalPrice, 'currency') }}
          </span>
          <ProductPriorPrice
            v-if="announcement"
            :price="announcement.priorPrice"
            class="font-mono text-sm text-muted tabular-nums"
          />
          <s
            v-else-if="wasPrice"
            class="font-mono text-sm text-muted tabular-nums"
          >
            {{ $i18n.n(wasPrice, 'currency') }}
          </s>
        </div>

        <!-- Above the stretched link, so it stays clickable. -->
        <div
          v-if="buy && !soldOut"
          class="relative z-10"
        >
          <!-- A target of at least 44px on a phone, whatever size the
               design's button is; as the design draws it from `sm` up. -->
          <component
            :is="buy.component"
            v-bind="buy.props(partInput)"
            class="
              min-h-11
              sm:min-h-0
            "
          />
        </div>
      </div>

      <!-- A design's restock control can be a full-width button, or the
           alert a signed-in shopper already set with its cancel action
           (webside's): it takes a row of its own under the price rather
           than squeezing beside it. -->
      <div
        v-if="buy && soldOut"
        class="relative z-10 w-full pt-1"
      >
        <component
          :is="buy.component"
          v-bind="buy.props(partInput)"
        />
      </div>
    </div>
  </article>
</template>

<i18n lang="yaml">
el:
  add_to_cart: Στο καλάθι
  add_named: 'Στο καλάθι: {name}'
  in_stock: Διαθέσιμο
  sold_out: Εξαντλήθηκε
  only_n_left: 'Μόνο {count} απέμεινε | Μόνο {count} απέμειναν'
en:
  add_to_cart: Add to cart
  add_named: 'Add to cart: {name}'
  in_stock: In stock
  sold_out: Sold out
  only_n_left: 'Only {count} left | Only {count} left'
</i18n>
