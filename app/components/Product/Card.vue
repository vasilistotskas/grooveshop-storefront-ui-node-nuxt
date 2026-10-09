<script lang="ts" setup>
import type { PropType } from 'vue'

/**
 * One product, wherever products are listed.
 *
 * Four things decide whether a shopper clicks: the photograph, what it
 * is, what it costs, and whether it is worth buying. So the card is the
 * photograph on a sunken tile, and under it the brand, the name, the
 * rating and the price — nothing boxed around them.
 *
 * The photograph carries one badge, by priority (sold out, a discount,
 * new); stock running low is a line under the price, where the shopper
 * is deciding. The buy button is ALWAYS visible, not revealed on hover —
 * a hover-only control does not exist on a touch screen: an "Add" pill
 * on the photograph from `sm` up, an icon button beside the price on a
 * phone, as the design draws them.
 *
 * Renders only the fields the payload has: a product without a brand or
 * reviews shows no brand line or stars. Search hits carry the same
 * `brandName`, `reviewCount`, `createdAt` and `lowStockThreshold` as a
 * product, so a listing card is the home card.
 */
const props = defineProps({
  product: { type: Object as PropType<Product>, required: true },
  /**
   * The element the card renders as. `li` inside the `<ul>`/`<ol>` of a
   * listing, `div` inside a carousel or a grid that is not a list —
   * an `<li>` with no list parent is invalid markup and assistive
   * technology announces it as a list of one.
   */
  as: { type: String, required: false, default: 'li' },
  showAddToFavouriteButton: { type: Boolean, required: false, default: true },
  showAddToCartButton: { type: Boolean, required: false, default: true },
  imgWidth: { type: Number, required: false, default: 420 },
  imgHeight: { type: Number, required: false, default: 357 },
  imgLoading: {
    type: String as PropType<ImageLoading>,
    required: false,
    default: undefined,
    validator: (value: string) => ['lazy', 'eager'].includes(value),
  },
})

const emit = defineEmits<{
  (e: 'favourite-delete', id: number): void
}>()

/**
 * How long a product reads as new. Long enough that a fortnightly
 * restock is still "new" when a shopper comes back, short enough that
 * the badge means something.
 */
const NEW_FOR_DAYS = 21

const localePath = useLocalePath()
const { productUrl } = useUrls()
const { t, locale } = useI18n()
const { $i18n } = useNuxtApp()
const { user } = useUserSession()
const userStore = useUserStore()
const { getFavouriteIdByProductId } = userStore
const productAlertsEnabled = useSettingFlag('PRODUCT_ALERTS_ENABLED', { fallback: false })

const { product } = toRefs(props)

// Search results (`ProductMeiliSearchResult`) carry the product's id in
// `master`; everything else carries it in `id`.
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

// `useUrls` returns locale-less route paths; the card linked every
// English shopper to the Greek product page.
const to = computed(() => localePath({ path: productUrl(productId.value, product.value.slug) }))

const outOfStock = computed(() => (product.value?.stock ?? 0) <= 0)

const lowStockCount = computed(() => lowStockLeft(product.value))

const isNew = computed(() => {
  const createdAt = (product.value as { createdAt?: string })?.createdAt
  if (!createdAt) return false
  const age = Date.now() - new Date(createdAt).getTime()
  return age >= 0 && age < NEW_FOR_DAYS * 24 * 60 * 60 * 1000
})

/**
 * The one thing worth saying in a corner of the photograph, most urgent
 * first: you cannot buy it, it is cheaper than usual, it is new.
 */
const badge = computed(() => {
  if (outOfStock.value) {
    return { label: t('sold_out'), color: 'neutral' as const, variant: 'soft' as const, class: undefined }
  }
  if ((product.value.discountPercent ?? 0) > 0) {
    return {
      // U+2212, the minus sign the design sets, not a hyphen.
      label: `−${Math.round(product.value.discountPercent ?? 0)}%`,
      color: 'neutral' as const,
      variant: 'solid' as const,
      class: 'bg-volt text-on-volt',
    }
  }
  if (isNew.value) {
    return { label: t('new'), color: 'primary' as const, variant: 'solid' as const, class: undefined }
  }
  return undefined
})

/**
 * Solid stars, 14px, the empty ones a step lighter than muted text — the
 * design's; the default icon is an outline, which read as no rating.
 */
const STARS_UI = {
  item: 'size-3.5',
  icon: 'size-3.5',
  emptyIcon: 'text-(--ui-border-accented)',
}

/** `reviewAverage` is the model's 1..10; stars are the 5 a reader expects. */
const ratingOutOfFive = computed(() => (product.value.reviewAverage ?? 0) / 2)
const ratingText = computed(() =>
  $i18n.n(ratingOutOfFive.value, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
)

// Wholesale price hydration — client-only, retail renders first then
// swaps (the cached anonymous catalogue HTML must never carry a
// per-customer price; see useB2BPricing).
const { register: registerB2BPrice, priceFor: b2bPriceFor } = useB2BPricing()
onMounted(() => {
  registerB2BPrice(productId.value)
})
const b2bPrice = computed(() => b2bPriceFor(productId.value))
const isWholesalePrice = computed(() =>
  !!b2bPrice.value
  && Number(b2bPrice.value.finalPrice) < (product.value.finalPrice ?? 0),
)
const displayFinalPrice = computed(() =>
  isWholesalePrice.value && b2bPrice.value
    ? Number(b2bPrice.value.finalPrice)
    : product.value.finalPrice,
)

// What the shopper would otherwise have paid — the number to strike
// through (see productWasPrice for why it is not `product.price`).
const wasPrice = computed(() => productWasPrice(product.value, displayFinalPrice.value))

const addToCartName = computed(() => t('add_named', { name: productName.value ?? '' }))

const favouriteId = computed(() => getFavouriteIdByProductId(productId.value))

// A listing payload carries no price-alert flag, so a card offers the
// restock alert only; the product page offers both.
const notify = reactive({ mounted: false, open: false, kind: 'restock' as ProductAlertKindEnum })
const onFavouriteDelete = (id: number) => emit('favourite-delete', id)
</script>

<template>
  <component
    :is="as"
    class="
      group relative flex w-full max-w-full min-w-0 flex-col gap-2.5
      sm:gap-3.5
    "
  >
    <div class="relative aspect-[4/3.4] overflow-hidden rounded-[0.875rem] bg-elevated">
      <!-- Not a link of its own: the title's stretched link already
           covers the whole card, and a second one here would be a
           second tab stop to the same page. -->
      <ImgWithFallback
        :loading="imgLoading"
        class="
          size-full object-cover transition-transform duration-300
          group-hover:scale-[1.03]
        "
        :class="outOfStock && 'opacity-60 grayscale'"
        :src="product.mainImagePath"
        :width="imgWidth"
        :height="imgHeight"
        fit="cover"
        :alt="productName"
        quality="90"
        densities="x1 x2"
        sizes="xs:50vw md:33vw lg:25vw"
      />

      <UBadge
        v-if="badge"
        :label="badge.label"
        :color="badge.color"
        :variant="badge.variant"
        :class="badge.class"
        class="absolute start-2.5 top-2.5 z-10"
      />

      <!-- Per-visitor: a cached anonymous card must not carry this
           shopper's favourites. -->
      <ClientOnly>
        <LazyButtonProductAddToFavourite
          v-if="showAddToFavouriteButton"
          :product-id="productId"
          :user-id="user?.id"
          :favourite-id="favouriteId"
          size="sm"
          class="
            absolute end-2 top-2 z-10 bg-default/90 ring-0
            hover:bg-default
          "
          @favourite-delete="onFavouriteDelete"
        />
      </ClientOnly>

      <LazyButtonProductAddToCart
        v-if="showAddToCartButton"
        :product="product"
        :quantity="1"
        :text="addToCartName"
        :label="t('add')"
        icon="i-heroicons-plus"
        color="primary"
        size="sm"
        :block="false"
        class="
          absolute end-2.5 bottom-2.5 z-10 hidden
          sm:inline-flex
        "
      />
    </div>

    <div class="flex flex-col gap-1 px-0.5">
      <p
        v-if="product.brandName"
        class="text-[0.6875rem] font-bold tracking-[0.08em] text-muted uppercase"
      >
        {{ product.brandName }}
      </p>

      <NuxtLink
        :to="to"
        :aria-label="`${t('view_product')}: ${productName}`"
        class="
          text-highlighted
          after:absolute after:inset-0
          focus-visible:outline-2 focus-visible:outline-secondary
        "
      >
        <!-- The link stretches over the whole card, so the card is one
             target instead of three. The controls above it sit on a
             higher layer and stay clickable. -->
        <h3 class="line-clamp-2 text-sm/[1.35] font-semibold text-pretty sm:text-[0.9375rem]">
          {{ productName }}
        </h3>
      </NuxtLink>

      <div
        v-if="product.reviewCount"
        class="flex items-center gap-1.5"
      >
        <UInputRating
          :model-value="ratingOutOfFive"
          :length="5"
          :step="0.5"
          size="xs"
          color="primary"
          icon="i-heroicons-star-solid"
          :ui="STARS_UI"
          readonly
          :aria-label="t('rated_n', { n: ratingText })"
        />
        <span class="text-[0.8125rem] font-semibold text-muted">
          {{ ratingText }} · {{ product.reviewCount }}
        </span>
      </div>

      <div class="mt-0.5 flex items-center justify-between gap-2">
        <div class="flex flex-wrap items-baseline gap-x-2">
          <span class="font-mono text-base font-bold tabular-nums text-highlighted sm:text-lg">
            {{ $i18n.n(displayFinalPrice, 'currency') }}
          </span>
          <span
            v-if="wasPrice"
            class="font-mono text-sm tabular-nums text-muted line-through"
          >
            {{ $i18n.n(wasPrice, 'currency') }}
          </span>
        </div>
        <LazyButtonProductAddToCart
          v-if="showAddToCartButton"
          :product="product"
          :quantity="1"
          :text="addToCartName"
          icon="i-heroicons-plus"
          color="primary"
          size="sm"
          icon-only
          class="
            relative z-10
            sm:hidden
          "
        />
      </div>

      <p
        v-if="lowStockCount"
        class="text-xs font-bold text-warning"
      >
        {{ t('only_n_left', { count: lowStockCount }, lowStockCount) }}
      </p>
      <!-- Opens the restock alert in place, above the card's stretched
           link. The dialog mounts on the first open. -->
      <UButton
        v-if="outOfStock && productAlertsEnabled"
        :label="t('notify_back')"
        color="neutral"
        variant="link"
        size="sm"
        class="relative z-10 self-start p-0 text-[0.8125rem] font-semibold text-accent"
        @click="() => { notify.mounted = true; notify.open = true }"
      />
    </div>

    <LazyProductNotifyMe
      v-if="notify.mounted"
      v-model:open="notify.open"
      v-model:kind="notify.kind"
      :product-id="productId"
      :product-name="productName ?? ''"
      :product-image="product.mainImagePath"
      sold-out
      :price-drop="false"
    />
  </component>
</template>

<i18n lang="yaml">
el:
  add: Προσθήκη
  add_named: 'Προσθήκη του «{name}» στο καλάθι'
  sold_out: Εξαντλήθηκε
  new: Νέο
  only_n_left: 'Μόνο {count} απέμεινε | Μόνο {count} απέμειναν'
  notify_back: Ειδοποίησέ με όταν ξαναέρθει
  view_product: Προβολή προϊόντος
  rated_n: Βαθμολογία {n} στα 5
en:
  add: Add
  add_named: 'Add {name} to cart'
  sold_out: Sold out
  new: New
  only_n_left: 'Only {count} left | Only {count} left'
  notify_back: Notify me when it's back
  view_product: View product
  rated_n: Rated {n} out of 5
</i18n>
