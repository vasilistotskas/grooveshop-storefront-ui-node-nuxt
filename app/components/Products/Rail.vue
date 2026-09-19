<script lang="ts" setup>
/**
 * Products as a swipeable rail. Presentational — the band above owns
 * the fetch (`useProductRail`), because it has to know whether to
 * render its heading at all.
 */
withDefaults(defineProps<{
  products: Product[]
  showArrows?: boolean
  showDots?: boolean
  showAddToCart?: boolean
}>(), {
  showArrows: true,
  showDots: false,
  showAddToCart: true,
})

const { isMobileOrTablet } = useDevice()

/**
 * The arrows sit on the rail's own edges, not above it: the band's
 * heading row already ends in a "see all" link, and controls parked at
 * `-top-14 end-0` landed on top of it (a measured 48px overlap at
 * 1440). A third of the way down centres them on the product IMAGE
 * rather than the whole card, whose lower half is text and a buy
 * button.
 */
const carouselUi = {
  // The carousel's own container is `items-start`, so every slide takes
  // its natural height and the card's `h-full` resolves against it —
  // measured on the demo homepage, cards in one row ran 422/450/474px
  // and the buy buttons sat on three different lines. A card missing a
  // rating row is shorter than its neighbour; that must not move the
  // button.
  container: 'items-stretch',
  item: `
    basis-[78%] px-2
    sm:basis-1/2
    lg:basis-1/3
    xl:basis-1/4
  `,
  // The `sm:` values are not redundant: the carousel's own
  // horizontal variant sets `sm:-start-12`/`sm:-end-12`, and a
  // breakpoint-less override does not replace a breakpointed class —
  // both survive the merge, and the arrows hung 48px outside the
  // container, scrolling the page sideways by 24px at 1440.
  prev: 'start-1 sm:start-1 top-1/3 -translate-y-1/2 shadow-lg',
  next: 'end-1 sm:end-1 top-1/3 -translate-y-1/2 shadow-lg',
}

const arrowButton = {
  color: 'neutral' as const,
  variant: 'solid' as const,
  size: 'md' as const,
  square: true,
}
</script>

<template>
  <UCarousel
    v-slot="{ item }"
    :items="products"
    :arrows="!isMobileOrTablet && showArrows"
    :dots="showDots"
    :ui="carouselUi"
    :prev="arrowButton"
    :next="arrowButton"
    class="-mx-2"
  >
    <ProductCard
      as="div"
      :product="item"
      :show-add-to-cart-button="showAddToCart"
      :img-width="420"
      :img-height="420"
    />
  </UCarousel>
</template>
