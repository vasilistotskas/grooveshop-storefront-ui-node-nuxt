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
   * The product the shopper is looking at. Without one (and without
   * ``seedIds``) the strip asks for the surface's store-wide answer —
   * the empty cart.
   */
  seedId?: number
  /**
   * The basket the engine answers for — the cart page passes the cart's
   * product ids. An empty list asks nothing.
   */
  seedIds?: readonly number[]
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

const { t } = useStoreI18n('components/Product/Suggestions')

const { data, onCardClick } = useProductSuggestions(props)

const products = computed<readonly Product[]>(() =>
  (data.value?.items ?? []).map(item => item.product))
const hasItems = computed(() => products.value.length > 0)
const title = computed(() => t(`title.${props.surface}`))
const titleId = `product-suggestions-${props.surface}`

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
