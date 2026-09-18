<script lang="ts" setup>
import type { PropType } from 'vue'

/**
 * One product, wherever products are listed.
 *
 * Four things decide whether a shopper clicks: the photograph, what it
 * is, what it costs, and whether it is worth buying. Everything else on
 * the card competes with those, so the badges are the only other paint
 * and they each answer a question the shopper is already asking — is it
 * cheaper, is it new, can I still get it.
 *
 * The buy button is ALWAYS visible, not revealed on hover. A hover-only
 * control does not exist on a touch screen, is invisible to a keyboard
 * until it is focused, and hides the card's only action behind a
 * gesture the shopper has no reason to try.
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
  showShareButton: { type: Boolean, required: false, default: true },
  showAddToCartButton: { type: Boolean, required: false, default: true },
  imgWidth: { type: Number, required: false, default: 420 },
  imgHeight: { type: Number, required: false, default: 420 },
  showVat: { type: Boolean, required: false, default: false },
  showDescription: { type: Boolean, required: false, default: false },
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

const { productUrl } = useUrls()
const { t, locale } = useI18n()
const { $i18n } = useNuxtApp()
const { user } = useUserSession()
const userStore = useUserStore()
const { getFavouriteIdByProductId } = userStore
const { contentShorten } = useText()

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

const productDescription = computed(() => {
  if (!product.value) return ''
  if ('description' in product.value && typeof product.value.description === 'string') {
    return product.value.description
  }
  return extractTranslated(product.value, 'description', locale.value) || ''
})

const to = computed(() => ({ path: productUrl(productId.value, product.value.slug) }))

const outOfStock = computed(() => (product.value?.stock ?? 0) <= 0)

const isLowStock = computed(() => {
  const stock = product.value?.stock ?? 0
  if (stock <= 0) return false
  const threshold = product.value?.lowStockThreshold
  return stock <= (typeof threshold === 'number' && threshold > 0 ? threshold : 10)
})

const isNew = computed(() => {
  const createdAt = (product.value as { createdAt?: string })?.createdAt
  if (!createdAt) return false
  const age = Date.now() - new Date(createdAt).getTime()
  return age >= 0 && age < NEW_FOR_DAYS * 24 * 60 * 60 * 1000
})

/**
 * The one thing worth saying about this product in a corner of its
 * photograph, most urgent first: you cannot buy it, you almost cannot
 * buy it, it is cheaper than usual, it is new.
 */
const badge = computed(() => {
  if (outOfStock.value) {
    return { label: t('out_of_stock'), color: 'neutral' as const }
  }
  if (isLowStock.value) {
    return {
      label: t('only_n_left', { count: product.value.stock }),
      color: 'warning' as const,
    }
  }
  if ((product.value.discountPercent ?? 0) > 0) {
    return {
      label: `-${Math.round(product.value.discountPercent ?? 0)}%`,
      color: 'error' as const,
    }
  }
  if (isNew.value) {
    return { label: t('new'), color: 'secondary' as const }
  }
  return undefined
})

/** `reviewAverage` is the model's 1..10; stars are the 5 a reader expects. */
const ratingOutOfFive = computed(() => (product.value.reviewAverage ?? 0) / 2)

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

/**
 * What the shopper would otherwise have paid — the number to strike
 * through.
 *
 * NOT `product.price`, which is the NET price: `final_price = price +
 * vat - discount`, so on a VAT-bearing product with no discount the net
 * is LOWER than the final and striking it showed the price going up.
 * Pre-discount and VAT-inclusive is `finalPrice + discountValue`.
 */
const wasPrice = computed(() => {
  if (isWholesalePrice.value) return product.value.finalPrice

  const discount = Number(product.value.discountValue ?? 0)
  return discount > 0 ? (product.value.finalPrice ?? 0) + discount : undefined
})

const shareOptions = computed(() => ({
  title: productName.value || '',
  text: productDescription.value,
  url: import.meta.client ? productUrl(productId.value, product.value.slug) : '',
}))
const { share, isSupported } = useShare(shareOptions)
const startShare = async () => {
  try {
    await share()
  }
  catch (error) {
    log.error({ action: 'share:failed', error })
  }
}

const favouriteId = computed(() => getFavouriteIdByProductId(productId.value))
const onFavouriteDelete = (id: number) => emit('favourite-delete', id)
</script>

<template>
  <component
    :is="as"
    class="
      group relative flex h-full w-full max-w-full flex-col overflow-hidden
      rounded-xl bg-default ring ring-default transition
      hover:ring-accented
      focus-within:ring-2 focus-within:ring-secondary
    "
  >
    <div class="relative bg-elevated">
      <!-- ONE badge, by priority. Stacked, they competed for the same
           corner and said two things about one product; and on a
           freshly seeded catalogue every card was "new", which is the
           same as none of them being. -->
      <UBadge
        v-if="badge"
        v-bind="badge"
        size="sm"
        variant="solid"
        class="absolute start-3 top-3 z-10"
      />

      <!-- Per-visitor controls: a cached anonymous card must not carry
           this shopper's favourites, and Web Share support is only
           knowable in the browser. -->
      <ClientOnly>
        <div class="absolute end-3 top-3 z-10 flex gap-1.5">
          <UButton
            v-if="isSupported && showShareButton"
            :aria-label="t('share')"
            icon="i-heroicons-share"
            size="sm"
            color="neutral"
            variant="soft"
            square
            @click.stop="startShare"
          />
          <LazyButtonProductAddToFavourite
            v-if="showAddToFavouriteButton"
            :product-id="productId"
            :user-id="user?.id"
            :favourite-id="favouriteId"
            size="sm"
            @favourite-delete="onFavouriteDelete"
          />
        </div>
      </ClientOnly>

      <!-- Not a link of its own: the title's stretched link already
           covers the whole card, and a second one here would be a
           second tab stop to the same page. -->
      <div
        class="aspect-4/3 max-w-full overflow-hidden"
        :class="outOfStock && 'opacity-60 grayscale'"
      >
        <ImgWithFallback
          :loading="imgLoading"
          class="
            size-full max-w-full object-contain transition-transform
            duration-300
            group-hover:scale-105
          "
          :src="product.mainImagePath"
          :width="imgWidth"
          :height="imgHeight"
          fit="contain"
          background="transparent"
          :alt="productName"
          quality="90"
          densities="x1"
          sizes="xs:50vw md:33vw lg:25vw"
        />
      </div>
    </div>

    <div class="flex flex-1 flex-col gap-3 p-4">
      <p
        v-if="product.brandName"
        class="text-xs font-medium tracking-wide text-muted uppercase"
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
        <h3 class="line-clamp-2 text-sm font-medium text-pretty md:text-base">
          {{ productName }}
        </h3>
      </NuxtLink>

      <p
        v-if="showDescription"
        class="line-clamp-2 text-sm text-muted"
      >
        {{ contentShorten(productDescription, 0, 100) }}
      </p>

      <div
        v-if="product.reviewCount"
        class="flex items-center gap-1.5"
      >
        <UInputRating
          :model-value="ratingOutOfFive"
          :length="5"
          :step="0.5"
          size="xs"
          color="warning"
          readonly
          :aria-label="t('rated_n', { n: ratingOutOfFive.toFixed(1) })"
        />
        <span class="text-xs text-muted">({{ product.reviewCount }})</span>
      </div>

      <div class="mt-auto flex flex-col gap-1 pt-1">
        <div class="flex flex-wrap items-baseline gap-x-2">
          <span class="font-mono text-xl font-semibold tabular-nums text-highlighted">
            {{ $i18n.n(displayFinalPrice, 'currency') }}
          </span>
          <span
            v-if="wasPrice"
            class="font-mono text-sm tabular-nums text-dimmed line-through"
          >
            {{ $i18n.n(wasPrice, 'currency') }}
          </span>
        </div>
        <span
          v-if="showVat && product.vatPercent"
          class="text-xs text-dimmed"
        >
          {{ t('vat_included') }} {{ product.vatPercent }}%
        </span>
      </div>

      <LazyButtonProductAddToCart
        v-if="showAddToCartButton"
        :product="product"
        :quantity="1"
        :text="t('add_to_cart')"
        class="relative z-10 w-full"
      />
    </div>
  </component>
</template>

<i18n lang="yaml">
el:
  vat_included: ΦΠΑ περιλαμβάνεται
  share: Κοινοποίηση
  add_to_cart: Προσθήκη στο καλάθι
  out_of_stock: Εξαντλημένο
  new: Νέο
  only_n_left: Μόνο {count} απέμεινε | Μόνο {count} απέμειναν
  view_product: Προβολή προϊόντος
  rated_n: Βαθμολογία {n} στα 5
en:
  vat_included: VAT included
  share: Share
  add_to_cart: Add to cart
  out_of_stock: Out of stock
  new: New
  only_n_left: Only {count} left | Only {count} left
  view_product: View product
  rated_n: Rated {n} out of 5
</i18n>
