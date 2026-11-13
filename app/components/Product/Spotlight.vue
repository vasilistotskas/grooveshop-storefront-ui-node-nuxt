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
 *
 * `look: 'bold'` is `Product/SpotlightBold`: the same product read the same
 * way (`useProductSpotlight`), drawn heavier.
 */
const props = withDefaults(defineProps<{
  product: ProductCard
  /** The buy button; the store's `cart` feature decides too. */
  showAddToCart?: boolean
  /** `bold`: the heavier card a bold hero draws (`Product/SpotlightBold`). */
  look?: 'bold'
}>(), {
  showAddToCart: true,
})

const { t } = useStoreI18n('components/Product/Spotlight')
/** This component's texts, for its bold look (`Product/SpotlightBold`). */
const texts = (key: string, named: Record<string, unknown> = {}, plural?: number) =>
  plural === undefined ? t(key, named) : t(key, named, plural)
const { $i18n } = useNuxtApp()
const productReviewsEnabled = useStoreFeature('productReviews')

const { product } = toRefs(props)

const { name, to, soldOut, lowStockCount, displayFinalPrice, wasPrice, announcement, partInput, buy }
  = useProductSpotlight(product, () => props.showAddToCart, {
    label: () => t('add_to_cart'),
    name: name => t('add_named', { name }),
  })
</script>

<template>
  <ProductSpotlightBold
    v-if="look === 'bold'"
    :product="product"
    :show-add-to-cart="showAddToCart"
    :texts="texts"
  />
  <article
    v-else
    class="
      relative flex overflow-hidden rounded-lg border border-default bg-default
      max-sm:grid max-sm:grid-cols-[8.5rem_minmax(0,1fr)]
    "
  >
    <div
      class="
        w-34 shrink-0 bg-elevated
        max-sm:row-span-2
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
        max-sm:contents
        sm:p-5
      "
    >
      <div
        class="
          flex min-w-0 flex-col gap-1.5
          max-sm:px-3.5 max-sm:pt-3.5
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
      </div>

      <div
        class="
          mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2
          pt-1.5
          max-sm:contents
        "
      >
        <div
          class="
            flex flex-wrap items-baseline gap-x-2
            max-sm:col-start-2 max-sm:self-end max-sm:px-3.5 max-sm:pt-1.5
            max-sm:pb-3.5
          "
        >
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

        <!-- Above the stretched link, so it stays clickable. On a
             phone, the card's last row, and the control fills it: set on
             the row's children (`*:`), so any design's control does,
             whatever it lets through its attributes. -->
        <div
          v-if="buy && !soldOut"
          class="
            relative z-10
            max-sm:col-span-2 max-sm:p-3.5
            max-sm:*:w-full max-sm:*:justify-center
          "
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
           than squeezing beside it, and on a phone fills it as the buy
           button does. -->
      <div
        v-if="buy && soldOut"
        class="
          relative z-10 w-full pt-1
          max-sm:col-span-2 max-sm:p-3.5
          max-sm:*:w-full max-sm:*:justify-center
        "
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
