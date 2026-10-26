<script lang="ts" setup>
import type { AccordionItem, TabsItem, ButtonProps } from '#ui/types'

const { t, locale, n } = useI18n()
const route = useRoute(`products-id-slug___${locale.value}`)
const { y: scrollY } = useWindowScroll()

const { isMobileOrTablet } = useDevice()
const stickyAddToCartEnabled = useStorePreference('stickyAddToCart')
const productAlertsEnabled = useStoreFeature('productAlerts')
const suggestionsEnabled = useStoreFeature('productSuggestions')
const priceHistoryEnabled = useStoreFeature('priceHistory')
const tenantStore = useTenantStore()

// The price trend dialog mounts on the first open, and only then asks
// for the history.
const priceTrend = reactive({ mounted: false, open: false })
function openPriceTrend() {
  priceTrend.mounted = true
  priceTrend.open = true
}

const { user, loggedIn } = useUserSession()

const toast = useToast()
const { dateLocale } = useDateLocale()
const localePath = useLocalePath()
const siteConfig = useSiteConfig()
const mediaStreamBaseUrl = useMediaStreamBaseUrl()
const { productUrl } = useUrls()
const { declare, canonicalUrl } = useDocumentLocales()

const selectorQuantity = ref(1)

const productId = String(route.params.id)

const {
  product,
  productImages,
  productReviews,
  productReviewsEnabled,
  onReviewChanged,
  productName,
  productTitle,
  productDescription,
  sanitizedDescription,
  productStock,
  productSpecifications,
  displayFinalPrice,
  wasPrice,
  announcement,
  favouriteId,
  ogImage,
} = await useProductDetail(productId)

const formatProductPrice = (price?: number) => {
  return n(price || 0, 'currency')
}

const incrementQuantity = () => {
  if (selectorQuantity.value < productStock.value) {
    selectorQuantity.value++
  }
  else {
    toast.add({
      title: t('max_quantity_reached'),
      color: 'error',
    })
  }
}

const decrementQuantity = () => {
  if (selectorQuantity.value > 1) {
    selectorQuantity.value--
  }
}

const showStickyAddToCart = computed(() => scrollY.value > 350)

// The canonical and the hreflang set are built from the product's OWN
// id+slug (useDocumentLocales -> setupPageHeader), in the tenant's own
// origin, and name only the locales the product is written in.
declare(
  translatedLocales(product.value?.translations, 'name'),
  productUrl(product.value!.id, product.value!.slug),
)

const items = computed(() => [
  {
    to: localePath('index'),
    label: t('breadcrumb.items.index.label'),
    icon: t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('products'),
    label: t('breadcrumb.items.products.label'),
  },
  {
    to: localePath({
      name: 'products-id-slug',
      params: { id: productId, slug: product.value?.slug ?? '' },
    }),
    label: productTitle.value,
  },
])

const shareOptions = reactive({
  title: productName.value,
  text: extractTranslated(product.value, 'description', locale.value) || '',
  url: import.meta.client
    ? `/products/${product.value?.id}/${product.value?.slug}`
    : '',
})

const { share, isSupported } = useShare(shareOptions)

const startShare = async () => {
  try {
    await share()
  }
  catch (error) {
    log.error({ action: 'share:failed', error })
  }
}

const stockStatus = computed(() => {
  const stock = productStock.value
  if (stock === 0) {
    return { label: t('out_of_stock'), color: 'error', icon: 'i-heroicons-x-circle' } as { label: string, color: ButtonProps['color'], icon: string }
  }
  else if (stock <= 5) {
    return { label: t('low_stock', { count: stock }), color: 'warning', icon: 'i-heroicons-exclamation-triangle' } as { label: string, color: ButtonProps['color'], icon: string }
  }
  else {
    return { label: t('in_stock'), color: 'success', icon: 'i-heroicons-check-circle' } as { label: string, color: ButtonProps['color'], icon: string }
  }
})

const productTabs = computed<TabsItem[]>(() => [
  {
    label: t('description'),
    icon: 'i-heroicons-document-text',
    slot: 'description',
  },
  {
    label: t('specifications'),
    icon: 'i-heroicons-cpu-chip',
    slot: 'specifications',
  },
])

// AccordionItem requires value to be a string (TabsItem allows
// number too); mirror the tabs list into a dedicated typed array for
// the mobile accordion path.
const productAccordionItems = computed<AccordionItem[]>(() => [
  {
    label: t('description'),
    icon: 'i-heroicons-document-text',
    value: 'description',
  },
  {
    label: t('specifications'),
    icon: 'i-heroicons-cpu-chip',
    value: 'specifications',
  },
])

useSeoMeta({
  title: () => productTitle.value,
  description: () => productDescription.value,

  ogTitle: () => productTitle.value,
  ogDescription: () => productDescription.value,
  ogImage: () => ogImage.value,
  ogImageWidth: OG_IMAGE_SIZE.width,
  ogImageHeight: OG_IMAGE_SIZE.height,
  ogImageAlt: () => productTitle.value,
  ogUrl: () => canonicalUrl.value,
  ogSiteName: siteConfig.name,
  ogLocale: () => dateLocale.value,

  twitterCard: 'summary_large_image',
  twitterTitle: () => productTitle.value,
  twitterDescription: () => productDescription.value,
  twitterImage: () => ogImage.value,
  twitterImageAlt: () => productTitle.value,
})
// 'product' is a valid OG type per the OpenGraph spec for product detail pages;
// rich structured data is conveyed via Schema.org in useSchemaOrg below.
// Set via useHead because @unhead/vue's UseSeoMetaInput union omits 'product'.
useHead({ meta: [{ property: 'og:type', content: 'product' }] })

useHead({
  link: () => {
    // Preload the hero image so it's in flight before render — cuts
    // ~200-400ms off LCP on cold product detail pages.
    const heroHref = ogImage.value
    if (!heroHref) return []
    return [
      {
        rel: 'preload' as const,
        as: 'image' as const,
        href: heroHref,
        fetchpriority: 'high' as const,
      },
    ]
  },
  meta: [
    {
      name: 'keywords',
      content: extractTranslated(product.value, 'seoKeywords', locale.value) || productTitle.value,
    },
  ],
})

useSchemaOrg([
  // Object-valued schema properties (image, offers, aggregateRating,
  // review) may no longer be per-property getters since the
  // @unhead/schema-org v3 definer-type rewrite — reactive nodes must be
  // a single computed() over plain values instead.
  defineProduct(computed(() => productSchemaOrg({
    product: product.value!,
    name: productName.value,
    description: htmlToPlainText(extractTranslated(product.value, 'description', locale.value) || ''),
    url: canonicalUrl.value,
    // The catalogue feeds' variant (SEARCH_IMAGE_VARIANT): one URL per image
    // across the structured data, the sitemap and the Google / Meta feeds.
    imageUrls: (productImages.value ?? [])
      .map(img => img.mainImagePath)
      .filter((path): path is string => Boolean(path))
      .map(path => buildMediaStreamImageUrl(mediaStreamBaseUrl.value, path, SEARCH_IMAGE_VARIANT)),
    storeName: siteConfig.name,
    currency: tenantStore.defaultCurrency,
    reviews: productReviewsEnabled.value ? (productReviews.value?.results ?? []) : null,
    anonymousReviewer: t('reviews.anonymous'),
    reviewComment: review => extractTranslated(review, 'comment', locale.value),
  }))),

  defineBreadcrumb(computed(() => ({
    itemListElement: [
      {
        name: t('breadcrumb.items.index.label'),
        item: localePath('index'),
      },
      {
        name: t('breadcrumb.items.products.label'),
        item: localePath('products'),
      },
      {
        name: productTitle.value,
        item: canonicalUrl.value,
      },
    ],
  }))),
])
</script>

<template>
  <WebsidePageWrapper>
    <section
      v-if="product" id="product" class="
        md:mb-24
      "
    >
      <div
        class="
          mx-auto max-w-7xl md:pb-6
          sm:px-6
          lg:px-8
        "
      >
        <UBreadcrumb
          :items="items"
          :ui="{
            item: `
              text-primary-950
              dark:text-primary-50
            `,
            root: `
              text-xs
              md:text-base
            `,
          }"
          class="mb-5"
        />

        <div
          class="
            grid gap-6
            md:gap-8
            lg:grid-cols-2
          "
        >
          <WebsideProductImages :product="product" />

          <!-- min-w-0: below lg this is a grid item in an implicit ``auto``
               track, whose min-width:auto otherwise inflates the track to the
               min-content of the non-wrapping variant carousel (5 cards ≈
               600px) and blows the page out sideways on mobile. Zeroing it
               lets the carousel scroll inside the viewport instead. -->
          <div
            class="
              flex min-w-0 flex-col gap-4
              md:gap-6
            "
          >
            <div>
              <h1
                class="
                  text-2xl font-bold tracking-tight text-primary-950
                  sm:text-3xl
                  lg:text-4xl
                  dark:text-primary-50
                "
              >
                {{ productName }}
              </h1>

              <ProductRating
                v-if="productReviewsEnabled"
                :average="product.reviewAverage"
                :count="product.reviewCount"
                href="#reviews"
                verbose
                class="mt-2"
              />

              <UButton
                v-if="priceHistoryEnabled"
                :label="t('price_trend')"
                icon="i-lucide-chart-line"
                color="neutral"
                variant="link"
                size="sm"
                class="mt-2 p-0"
                aria-haspopup="dialog"
                @click="openPriceTrend"
              />

              <div class="mt-3 flex items-center gap-2">
                <UBadge
                  :color="stockStatus.color"
                  :icon="stockStatus.icon"
                  size="lg"
                  variant="soft"
                >
                  {{ stockStatus.label }}
                </UBadge>

                <UBadge
                  v-if="announcement"
                  color="info"
                  size="lg"
                  variant="soft"
                >
                  -{{ announcement.percent }}%
                </UBadge>
              </div>
            </div>

            <USeparator />

            <div class="flex flex-wrap items-end gap-4">
              <div class="flex flex-col">
                <span
                  class="
                    bg-gradient-to-r from-neutral-600 to-secondary-900
                    bg-clip-text text-3xl font-bold text-transparent
                    sm:text-4xl
                    dark:from-neutral-400 dark:to-secondary-400
                  "
                >
                  {{ formatProductPrice(displayFinalPrice) }}
                </span>

                <ProductPriorPrice
                  v-if="announcement"
                  :price="announcement.priorPrice"
                  class="
                    text-lg text-gray-500
                    dark:text-gray-200
                  "
                />

                <span
                  v-else-if="wasPrice"
                  class="
                    text-lg text-gray-500 line-through
                    dark:text-gray-200
                  "
                >
                  {{ formatProductPrice(wasPrice) }}
                </span>

                <span
                  class="
                    text-xs text-gray-500
                    dark:text-gray-400
                  "
                >
                  {{ t('vat_included') }}
                </span>
              </div>
            </div>

            <!-- Variant selectors (colour / memory / …). Renders nothing
                 unless the product belongs to a variant group. -->
            <WebsideProductVariantSelector v-if="product" :product="product" />

            <!-- Promotions that apply to THIS product, resolved by
                 Django against the same scope/exclusion rules the cart
                 engine uses. Sits with the other value messaging, right
                 above add-to-cart: an automatic offer is otherwise
                 invisible until the cart already qualifies for it.
                 Renders nothing when the store has promotions off or
                 nothing touches this product. -->
            <WebsideProductOffers v-if="product?.id" :product-id="product.id" />

            <!-- Loyalty Points Badge (logged in) / Guest CTA -->
            <WebsideLoyaltyPointsBadge
              v-if="loggedIn && product?.id"
              :product-id="product.id"
            />
            <WebsideProductGuestLoyaltyCTA
              v-else-if="product?.finalPrice"
              :product-price="product.finalPrice"
            />

            <USeparator />

            <div class="flex flex-wrap items-center gap-3">
              <ClientOnly>
                <UButton
                  v-if="isSupported"
                  :disabled="!isSupported"
                  :title="t('share')"
                  color="neutral"
                  variant="ghost"
                  size="lg"
                  icon="i-heroicons-share"
                  @click="startShare"
                >
                  {{ t('share') }}
                </UButton>
                <template #fallback>
                  <USkeleton class="h-9 w-full max-w-34" />
                </template>
              </ClientOnly>

              <WebsideButtonProductAddToFavourite
                :favourite-id="favouriteId"
                :product-id="product?.id"
                :user-id="user?.id"
              />
            </div>

            <USeparator />

            <div
              class="
                flex items-center gap-4
                sm:flex-row
              "
            >
              <div class="flex h-full">
                <label
                  class="sr-only mb-2 text-sm font-medium" for="quantity"
                >
                  {{ t('qty') }}
                </label>
                <UInputNumber
                  id="quantity"
                  v-model="selectorQuantity"
                  class="h-full"
                  :min="1"
                  :max="product?.stock"
                  :disabled="productStock === 0"
                  :ui="{
                    root: 'h-full',
                    base: 'h-full',
                  }"
                />
              </div>

              <div class="w-full flex h-full">
                <label class="sr-only mb-2 block text-sm font-medium opacity-0">
                  {{ t('add_to_cart') }}
                </label>
                <WebsideButtonProductAddToCart
                  :product="product"
                  :quantity="selectorQuantity || 1"
                  :text="t('add_to_cart')"
                  class="w-full"
                />
              </div>
            </div>

            <WebsideShippingFreeShippingNotice />

            <!-- Out-of-stock subscribers: let the shopper opt into a
                 restock email. The backend ProductAlert infra handles
                 one-shot delivery + dedupe per user/email+kind. -->
            <WebsideProductNotifyMe
              v-if="productAlertsEnabled && productStock === 0 && product?.id"
              :product-id="product.id"
              kind="restock"
            />

            <!-- Out of stock is a dead end: rescue it right where the
                 shopper learns the news, with the engine's
                 ``out_of_stock`` slot (curated replacements first). -->
            <LazyWebsideProductSuggestions
              v-if="suggestionsEnabled && productStock === 0 && product?.id"
              surface="out_of_stock"
              :seed-id="product.id"
              hydrate-on-visible
            />

            <!-- Price-drop subscribers: independent of stock — a shopper
                 may want to watch the price even for out-of-stock items.
                 Target price is validated below the current final price
                 so the alert doesn't fire immediately.
                 Gated on ``product.priceDropAlertsEnabled``: admins opt
                 individual SKUs into the feature (default off) so we
                 don't promise an alert we can't honour for products
                 whose pricing is too volatile or manually managed. -->
            <WebsideProductNotifyMe
              v-if="productAlertsEnabled && product?.id && product?.priceDropAlertsEnabled && (product?.finalPrice ?? 0) > 0"
              :product-id="product.id"
              kind="price_drop"
              :current-price="product.finalPrice"
            />

            <USeparator class="my-2" />

            <!--
              Description + specs render as tabs on desktop (more
              content above the fold) but collapse to an accordion on
              mobile so the two sections don't push reviews / related
              rails off a narrow viewport. useDevice() reads the UA
              server-side so SSR picks the right shell and avoids a
              hydration re-render.
            -->
            <UTabs
              v-if="!isMobileOrTablet"
              :items="productTabs"
              class="w-full"
              color="neutral"
            >
              <template #description>
                <WebsideProductDescriptionPanel :html="sanitizedDescription" />
              </template>
              <template #specifications>
                <WebsideProductSpecificationsPanel :specifications="productSpecifications" />
              </template>
            </UTabs>
            <UAccordion
              v-else
              :items="productAccordionItems"
              default-value="description"
              type="single"
              class="w-full"
            >
              <template #body="{ item }">
                <WebsideProductDescriptionPanel
                  v-if="item.value === 'description'"
                  :html="sanitizedDescription"
                />
                <WebsideProductSpecificationsPanel
                  v-else-if="item.value === 'specifications'"
                  :specifications="productSpecifications"
                />
              </template>
            </UAccordion>
          </div>
        </div>

        <!-- Product-page suggestions. SSR-rendered from a Nitro-cached
             payload, hydrated on scroll so the impression is reported
             only when the strip is actually seen. The out-of-stock
             slot above replaces it for a product that cannot be bought. -->
        <LazyWebsideProductSuggestions
          v-if="suggestionsEnabled && productStock > 0 && product?.id"
          surface="pdp"
          :seed-id="product.id"
          hydrate-on-visible
          class="mt-10"
        />

        <USeparator v-if="productReviewsEnabled" class="my-10" />

        <ProductReviewsSection
          v-if="productReviewsEnabled"
          :product="product"
          :product-name="productName"
          :first-page="productReviews"
          @changed="onReviewChanged"
        />
      </div>

      <div
        v-if="stickyAddToCartEnabled && showStickyAddToCart"
        class="
          fixed right-0 bottom-18 left-0 z-40 border-t border-gray-200
          bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm
          md:bottom-0
          dark:border-gray-700 dark:bg-gray-900/95
        "
      >
        <div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <WebsideProductImage
              v-if="productImages && productImages[0]"
              :key="product?.id"
              :image="productImages[0]"
              :width="64"
              :height="64"
              class="
                h-12 w-12 shrink-0 rounded-lg object-contain
                md:h-16 md:w-16
              "
            />
            <div class="min-w-0 flex-1">
              <h3 class="truncate text-sm font-medium">
                {{ productTitle }}
              </h3>
              <div class="flex items-center gap-2">
                <span
                  class="
                    text-lg font-bold text-primary-600
                    dark:text-primary-400
                  "
                >
                  {{ formatProductPrice(product ? productCurrentPrice(product) : undefined) }}
                </span>
                <UBadge
                  v-if="productStock <= 5 && productStock > 0"
                  :color="stockStatus.color"
                  size="sm"
                  variant="soft"
                >
                  {{ stockStatus.label }}
                </UBadge>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div
              class="
                hidden items-center gap-1
                sm:flex
              "
            >
              <UButton
                icon="i-heroicons-minus"
                color="neutral"
                variant="ghost"
                size="sm"
                :disabled="selectorQuantity <= 1"
                @click="decrementQuantity"
              />
              <span class="min-w-8 text-center text-sm font-medium">
                {{ selectorQuantity }}
              </span>
              <UButton
                icon="i-heroicons-plus"
                color="neutral"
                variant="ghost"
                size="sm"
                :disabled="selectorQuantity >= productStock"
                @click="incrementQuantity"
              />
            </div>

            <WebsideButtonProductAddToCart
              :product="product"
              :quantity="selectorQuantity || 1"
              :text="t('add_to_cart')"
              size="xl"
            />
          </div>
        </div>
      </div>
    </section>

    <LazyProductPriceTrendDialog
      v-if="priceTrend.mounted && product"
      v-model:open="priceTrend.open"
      :product-id="product.id"
      :product-name="productName"
    />
  </WebsidePageWrapper>
</template>

<i18n lang="yaml">
el:
  breadcrumb:
    items:
      products:
        label: Προϊόντα
  product_id: Αναγνωριστικό προϊόντος
  qty: Ποσότητα
  share: Μοιράσου το
  max_quantity_reached: Επιτεύχθηκε η μέγιστη ποσότητα
  reviews:
    anonymous: Ανώνυμος πελάτης
  weight: Βάρος
  description: Περιγραφή
  specifications: Προδιαγραφές
  no_description_available: Δεν υπάρχει διαθέσιμη περιγραφή
  no_specifications_available: Δεν υπάρχουν διαθέσιμες προδιαγραφές
  add_to_cart: Αγορά
  out_of_stock: Μη διαθέσιμο
  low_stock: Χαμηλό απόθεμα ({count})
  in_stock: Διαθέσιμο
  vat_included: Περιλαμβάνει ΦΠΑ
  price_trend: Εξέλιξη τιμής
en:
  breadcrumb:
    items:
      products:
        label: Products
  product_id: Product ID
  qty: Quantity
  share: Share it
  max_quantity_reached: Maximum quantity reached
  reviews:
    anonymous: Anonymous shopper
  weight: Weight
  description: Description
  specifications: Specifications
  no_description_available: No description available
  no_specifications_available: No specifications available
  add_to_cart: Buy
  out_of_stock: Unavailable
  low_stock: Low stock ({count})
  in_stock: In stock
  vat_included: VAT included
  price_trend: Price history
</i18n>
