<script lang="ts" setup>
/**
 * One product, picked out on its own, in the bold look a bold hero draws
 * (`Product/Spotlight` with `look: 'bold'`): a raised card, the photograph on
 * a light tile, the name, then one line of rating (one star, the figure and
 * the count in brackets) and stock in its status colour, then the price beside
 * the store's own way to buy at every width. On a phone the line keeps only
 * the stock, and the buy button is its icon alone, 48px square, its label kept
 * for a screen reader (the accessible name holds it, WCAG 2.5.3).
 *
 * The product is read as `Product/Spotlight` reads it (`useProductSpotlight`):
 * the shopper's price, the prior price of an announced reduction, the stock,
 * the add-to-cart part or the restock alert. Every colour is a token.
 */
const props = withDefaults(defineProps<{
  product: ProductCard
  /** The buy button; the store's `cart` feature decides too. */
  showAddToCart?: boolean
  /**
   * The section's own texts (its `useStoreI18n` namespace), so a store's
   * edited wording follows when it switches look.
   */
  texts: (key: string, named?: Record<string, unknown>, plural?: number) => string
}>(), {
  showAddToCart: true,
})

const t = props.texts
const { $i18n } = useNuxtApp()
const productReviewsEnabled = useStoreFeature('productReviews')

const { product } = toRefs(props)

const { name, to, soldOut, lowStockCount, displayFinalPrice, wasPrice, announcement, partInput, buy }
  = useProductSpotlight(product, () => props.showAddToCart, {
    label: () => t('add_to_cart'),
    name: name => t('add_named', { name }),
  })

const buyInput = computed<DesignPartInput>(() => ({ ...partInput.value, leadingIcon: true }))
</script>

<template>
  <article
    class="
      relative flex overflow-hidden rounded-xl border border-default bg-muted
    "
  >
    <div
      class="
        w-34 shrink-0 bg-(--ui-color-neutral-100)
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
        flex min-w-0 flex-1 flex-col gap-1 px-3.5 py-3
        sm:gap-1.5 sm:px-5 sm:py-4.5
      "
    >
      <h2
        class="
          line-clamp-2 text-[0.9375rem]/[1.3] font-bold text-pretty
          wrap-break-word
          sm:text-[1.1875rem]/[1.3]
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

      <!-- The state as words in its status colour, on the card's dark or
           light ground alike (the tokens follow the band's scheme). -->
      <div
        class="
          flex flex-wrap items-center gap-1 text-xs
          sm:text-[0.8125rem]
        "
      >
        <template v-if="productReviewsEnabled && product.reviewCount">
          <ProductRating
            :average="product.reviewAverage"
            :count="product.reviewCount"
            single
            class="max-sm:hidden"
          />
          <span
            aria-hidden="true"
            class="
              text-muted
              max-sm:hidden
            "
          >·</span>
        </template>
        <p
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
      </div>

      <!-- The button stays at the right, beside the price, whenever the
           price itself fits: the price block's basis is its longest single
           line (`w-min`, then `grow`), so a prior price goes under the price
           first. Only a price too long for the row with the button
           (12.345,67 € at 320px) sends the button to a line of its own,
           still at the right (`ml-auto`). -->
      <div
        class="
          mt-auto flex flex-wrap items-center justify-between gap-2 pt-1.5
          sm:gap-3 sm:pt-2.5
        "
      >
        <div class="flex w-min min-w-0 grow flex-wrap items-baseline gap-x-2">
          <span
            class="
              text-xl font-extrabold text-highlighted tabular-nums
              sm:text-[1.625rem]
            "
          >
            {{ $i18n.n(displayFinalPrice, 'currency') }}
          </span>
          <ProductPriorPrice
            v-if="announcement"
            :price="announcement.priorPrice"
            class="text-sm text-muted tabular-nums"
          />
          <s
            v-else-if="wasPrice"
            class="text-sm text-muted tabular-nums"
          >
            {{ $i18n.n(wasPrice, 'currency') }}
          </s>
        </div>

        <!-- Above the stretched link, so it stays clickable. -->
        <div
          v-if="buy && !soldOut"
          class="relative z-10 ml-auto shrink-0"
        >
          <component
            :is="buy.component"
            v-bind="buy.props(buyInput)"
            class="
              min-h-12 w-auto
              max-sm:size-12 max-sm:justify-center max-sm:p-0
              max-sm:*:data-[slot=label]:sr-only
              sm:px-4.5 sm:text-[0.9375rem] sm:font-semibold
            "
          />
        </div>
      </div>

      <!-- A design's restock control can be a full-width button, or the
           alert a signed-in shopper already set with its cancel action: it
           takes a row of its own under the price. -->
      <div
        v-if="buy && soldOut"
        class="relative z-10 w-full pt-1"
      >
        <component
          :is="buy.component"
          v-bind="buy.props(buyInput)"
        />
      </div>
    </div>
  </article>
</template>
