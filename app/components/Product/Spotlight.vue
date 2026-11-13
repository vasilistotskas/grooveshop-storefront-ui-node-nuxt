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
 *
 * On a phone the way to buy is a row of its own across the whole card,
 * under the picture and the text: beside the price, in a text column of
 * 104 to 136px at 320px, a design's button (138 to 166px wide) was cut
 * off, and at 390 it crowded the price. The card is then a grid whose
 * text and price rows sit beside the picture (the text column and the
 * price row become its items, `max-sm:contents`); from `sm` up it is
 * the row it always was, the button beside the price.
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

const design = useStorefrontDesign()
const look = computed(() => (design.value === 'volt' ? VOLT_LOOK : OWN_LOOK))
</script>

<script lang="ts">
/**
 * Each part's classes per design. Groove Volt keeps its own. The base design
 * (a store with its own templates, webside) draws its board's card: a raised
 * tile with a larger radius, the picture on a light tile, the rating and the
 * stock on one line (the stock alone on a phone, as words in its status
 * colour), and the price beside the buy button at every width; on a phone
 * the button is its icon alone, 48px square, its label kept for a screen
 * reader.
 */
const VOLT_LOOK = {
  card: `
    relative flex overflow-hidden rounded-lg border border-default bg-default
    max-sm:grid max-sm:grid-cols-[8.5rem_minmax(0,1fr)]
  `,
  picture: `
    w-34 shrink-0 bg-elevated
    max-sm:row-span-2
    sm:w-42
  `,
  body: `
    flex min-w-0 flex-1 flex-col gap-1.5 p-3.5
    max-sm:contents
    sm:p-5
  `,
  copy: `
    flex min-w-0 flex-col gap-1.5
    max-sm:px-3.5 max-sm:pt-3.5
  `,
  title: `
    line-clamp-2 text-[0.9375rem]/snug font-bold text-pretty wrap-break-word
    sm:text-lg/snug
  `,
  facts: 'contents',
  rating: '',
  stockWords: false,
  row: `
    mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-1.5
    max-sm:contents
  `,
  prices: `
    flex flex-wrap items-baseline gap-x-2
    max-sm:col-start-2 max-sm:self-end max-sm:px-3.5 max-sm:pt-1.5
    max-sm:pb-3.5
  `,
  price: `
    font-mono text-xl font-bold text-highlighted tabular-nums
    sm:text-2xl
  `,
  buy: `
    relative z-10
    max-sm:col-span-2 max-sm:p-3.5
    max-sm:*:w-full max-sm:*:justify-center
  `,
  buyControl: `
    min-h-11
    sm:min-h-0
  `,
  restock: `
    relative z-10 w-full pt-1
    max-sm:col-span-2 max-sm:p-3.5
    max-sm:*:w-full max-sm:*:justify-center
  `,
}

const OWN_LOOK: typeof VOLT_LOOK = {
  card: 'relative flex overflow-hidden rounded-xl border border-default bg-muted',
  picture: `
    w-34 shrink-0 bg-(--ui-color-neutral-100)
    sm:w-42
  `,
  body: `
    flex min-w-0 flex-1 flex-col gap-1 px-3.5 py-3
    sm:gap-1.5 sm:px-5 sm:py-4.5
  `,
  copy: `
    flex min-w-0 flex-col gap-1
    sm:gap-1.5
  `,
  title: `
    line-clamp-2 text-[0.9375rem]/[1.3] font-bold text-pretty wrap-break-word
    sm:text-[1.1875rem]/[1.3]
  `,
  facts: `
    flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs
    sm:text-[0.8125rem]
  `,
  rating: 'max-sm:hidden',
  stockWords: true,
  row: `
    mt-auto flex items-center justify-between gap-2 pt-1.5
    sm:gap-3 sm:pt-2.5
  `,
  prices: 'flex min-w-0 flex-wrap items-baseline gap-x-2',
  price: `
    text-xl font-extrabold text-highlighted tabular-nums
    sm:text-[1.625rem]
  `,
  buy: 'relative z-10 shrink-0',
  // On a phone the icon alone fills a 48px square; the label stays for a
  // screen reader (the accessible name holds it, WCAG 2.5.3).
  buyControl: `
    min-h-12 w-auto
    max-sm:size-12 max-sm:justify-center max-sm:p-0
    max-sm:*:data-[slot=label]:sr-only
    sm:px-4.5
  `,
  restock: 'relative z-10 w-full pt-1',
}
</script>

<template>
  <article :class="look.card">
    <div :class="look.picture">
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

    <div :class="look.body">
      <div :class="look.copy">
        <h2 :class="look.title">
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

        <div :class="look.facts">
          <ProductRating
            v-if="productReviewsEnabled"
            :average="product.reviewAverage"
            :count="product.reviewCount"
            :class="look.rating"
          />

          <!-- The base design: the state as words in its status colour.
               Volt: the words in the reading colours, the state in the
               dot, since a status colour as 12px type misses AA on a light
               ground. -->
          <p
            v-if="look.stockWords"
            class="font-semibold"
            :class="soldOut ? 'text-muted' : lowStockCount ? 'text-warning' : `
              text-success
            `"
          >
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
          <p
            v-else
            class="flex items-center gap-1.5 text-xs font-semibold text-toned"
          >
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
        </div>
      </div>

      <div :class="look.row">
        <div :class="look.prices">
          <span :class="look.price">
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

        <!-- Above the stretched link, so it stays clickable. Volt, on a
             phone: the card's last row, and the control fills it, set on
             the row's children (`*:`), so any design's control does,
             whatever it lets through its attributes. -->
        <div
          v-if="buy && !soldOut"
          :class="look.buy"
        >
          <component
            :is="buy.component"
            v-bind="buy.props(partInput)"
            :class="look.buyControl"
          />
        </div>
      </div>

      <!-- A design's restock control can be a full-width button, or the
           alert a signed-in shopper already set with its cancel action
           (webside's): it takes a row of its own under the price rather
           than squeezing beside it, and on a phone fills it as the buy
           button does. -->
      <div
        v-if="buy && soldOut"
        :class="look.restock"
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
