<script lang="ts" setup>
import type { AccordionItem, TabsItem, ButtonProps } from '#ui/types'

const { t, locale, n } = useI18n()
const route = useRoute(`products-id-slug___${locale.value}`)
const { y: scrollY } = useWindowScroll()

const { isMobileOrTablet } = useDevice()
// Merchant UI toggle — fails OPEN so the purchase CTA never
// disappears on a settings hiccup.
const stickyAddToCartEnabled = useSettingFlag('STICKY_ADD_TO_CART_ENABLED', {
  fallback: true,
})
// Merchant feature toggles (endpoints are also gated server-side).
const productReviewsEnabled = useSettingFlag('PRODUCT_REVIEWS_ENABLED', {
  fallback: true,
})
const productAlertsEnabled = useSettingFlag('PRODUCT_ALERTS_ENABLED', {
  fallback: true,
})
// Suggestion strips: plan flag AND merchant setting, fails CLOSED —
// a commercial surface that flashes and vanishes is worse than one
// that appears a beat late.
const productSuggestionsEnabled = useSettingFlag('PRODUCT_SUGGESTIONS_ENABLED', {
  fallback: false,
})
const tenantStore = useTenantStore()
const suggestionsEnabled = computed(
  () => tenantStore.recommendationsEnabled && productSuggestionsEnabled.value,
)

const { user, loggedIn } = useUserSession()

const toast = useToast()
const { dateLocale } = useDateLocale()
const localePath = useLocalePath()
const siteConfig = useSiteConfig()
const runtimeConfig = useRuntimeConfig()
const img = useMediaStreamImage()

const userStore = useUserStore()
const { getFavouriteIdByProductId, updateFavouriteProducts } = userStore

const isReviewModalOpen = ref(false)
const isLoginModalOpen = ref(false)
const selectorQuantity = ref(1)

const productId = 'id' in route.params ? route.params.id : undefined

// Track product view count (client-side only, fire-and-forget)
const { trackView } = useViewCount()
if (productId) {
  trackView('product', Number(productId))
}

// Meta/TikTok Pixel — ViewContent / GA4 — view_item, all fire once
// per product detail load on the client. SSR-safe via ``onMounted``
// so the prerender pass never produces a phantom event. Browser-only
// (no server-side leg for any of them).
const metaPixel = useMetaPixel()
const tiktokPixel = useTikTokPixel()
const openaiPixel = useOpenAIPixel()
const ga4 = useGA4()
const viewContentFired = ref(false)

// Client-side recently-viewed rail. We record the visit once the product
// detail lands (below) so we have the translated name + image to show
// without re-fetching on homepage/PDP rails.
const recentlyViewed = useRecentlyViewed()

const { data: product, error: productError, refresh: refreshProduct } = await useFetch<ProductDetail>(
  `/api/products/${productId}`,
  {
    key: `product${productId}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      languageCode: locale,
    },
  },
)

if (!product.value) {
  // Distinguish "row really absent" (404) from "backend unavailable"
  // (5xx / timeout): a transient upstream failure must surface as 503
  // so crawlers treat it as temporary — a 404 here de-indexes live
  // products during backend blips — and so error.vue's one-shot
  // reload can self-heal the visit.
  const upstreamStatus = productError.value?.statusCode ?? 404
  throw createError(
    upstreamStatus >= 500
      ? { statusCode: 503, message: t('error.service.unavailable') }
      : { statusCode: 404, message: t('error.page.not.found') },
  )
}

// Fetch images and reviews in parallel (both needed for SSR/Schema.org)
const [
  { data: productImages },
  { data: productReviews, refresh: refreshProductReviews },
] = await Promise.all([
  useFetch(
    `/api/products/${product.value?.id}/images`,
    {
      key: `productImages${product.value?.id}`,
      method: 'GET',
      headers: useRequestHeaders(),
      query: {
        languageCode: locale,
      },
    },
  ),
  useFetch(
    `/api/products/${productId}/reviews`,
    {
      key: `productReviewsSchema${productId}`,
      method: 'GET',
      headers: useRequestHeaders(),
      query: {
        languageCode: locale,
      },
    },
  ),
])

const { transformImages } = useHtmlContent()

const sanitizedDescription = computed(() =>
  transformImages(extractTranslated(product.value, 'description', locale.value) ?? ''),
)

const shouldFetchFavouriteProducts = computed(() => {
  return loggedIn.value
})

// User-specific data: client-side only. The trigger is deferred to
// ``onMounted`` — not called during setup — because Nuxt's payload
// cache can resolve this synchronously during hydration (same key from
// a prior navigation), which would populate the store before the heart
// button hydrates and produce a ``Hydration mismatch`` that Vue **does
// not rectify in production**. Triggering after mount keeps SSR and the
// initial client render identical, so the subsequent store update
// flows through the normal reactive patch path.
const { execute: fetchFavourites } = useLazyFetch('/api/products/favourites/favourites-by-products', {
  key: `favouritesByProducts${user.value?.id}`,
  method: 'POST',
  body: {
    productIds: [Number(productId)],
  },
  server: false,
  immediate: false,
  onResponse({ response }) {
    if (!response.ok) {
      return
    }
    const favourites = response._data
    if (favourites) {
      updateFavouriteProducts(favourites)
    }
  },
})

onMounted(() => {
  watchEffect(() => {
    if (shouldFetchFavouriteProducts.value) fetchFavourites()
  })

  // Meta Pixel: ViewContent. Browser-only event; no server-side
  // dedup, so the eventID is a fresh UUID minted by the composable.
  // Fires once per page mount — guard prevents duplicate fires when
  // the product reactive ref re-resolves on hydration with the same
  // payload. Uses the translated name + the cheapest active price
  // so reporting matches what the customer saw.
  if (viewContentFired.value || !product.value) return
  try {
    const productData = product.value
    const pid = productData.id != null ? String(productData.id) : ''
    const price = Number(
      productData.finalPrice ?? productData.price ?? 0,
    )
    // The same name the page shows, so what the pixels report and
    // what the shopper saw are one string.
    const reportedName = productName.value
    metaPixel.trackViewContent({
      currency: 'EUR',
      value: price,
      contentType: 'product',
      contentIds: pid ? [pid] : [],
      contents: pid
        ? [
            {
              id: pid,
              quantity: 1,
              itemPrice: price,
            },
          ]
        : [],
      contentName: reportedName,
    })
    openaiPixel.trackContentsViewed({
      currency: 'EUR',
      amount: price,
      contents: pid
        ? [{ id: pid, name: reportedName, contentType: 'product', quantity: 1 }]
        : [],
    })
    tiktokPixel.trackViewContent({
      currency: 'EUR',
      value: price,
      contentType: 'product',
      contentName: reportedName,
      contents: pid
        ? [
            {
              contentId: pid,
              contentName: reportedName,
              quantity: 1,
              price,
            },
          ]
        : [],
    })
    ga4.trackViewItem({
      currency: 'EUR',
      value: price,
      items: pid
        ? [
            {
              item_id: pid,
              item_name: reportedName,
              price,
              quantity: 1,
            },
          ]
        : [],
    })
    viewContentFired.value = true
  }
  catch (pixelErr) {
    log.warn(
      'product:metaPixelViewContent',
      String((pixelErr as Error)?.message ?? pixelErr),
    )
  }
})

// User-specific data: client-side only
const { data: userProductReview, refresh: refreshUserProductReview }
  = useLazyFetch(`/api/products/reviews/${productId}/user-product-review`, {
    key: `productReviews${productId}${user.value?.id}`,
    method: 'GET',
    immediate: loggedIn.value,
    server: false, // Client-side only - user-specific data
  })

const userHadReviewed = computed(() => !!userProductReview.value)

// The review widget used to refetch a list of its own that nothing
// rendered; the list on THIS page is the one that must move.
const onReviewChanged = async () => {
  await Promise.all([
    refreshProduct(),
    refreshUserProductReview(),
    refreshProductReviews(),
  ])
}
const onAddExistingReview = onReviewChanged
const onUpdateExistingReview = onReviewChanged
const onDeleteExistingReview = onReviewChanged

const formatProductPrice = (price?: number) => {
  return n(price || 0, 'currency')
}

// Wholesale price hydration — client-only, retail renders first then
// swaps (cached/anonymous catalogue HTML must never carry a
// per-customer price; see useB2BPricing).
const { register: registerB2BPrice, priceFor: b2bPriceFor } = useB2BPricing()
onMounted(() => {
  if (product.value?.id) {
    registerB2BPrice(product.value.id)
  }
})
const b2bPrice = computed(() =>
  product.value?.id ? b2bPriceFor(product.value.id) : undefined,
)
const isWholesalePrice = computed(() =>
  !!b2bPrice.value
  && Number(b2bPrice.value.finalPrice) < (product.value?.finalPrice ?? 0),
)
const displayFinalPrice = computed(() =>
  isWholesalePrice.value && b2bPrice.value
    ? Number(b2bPrice.value.finalPrice)
    : product.value?.finalPrice,
)

/**
 * What the shopper would otherwise have paid — the number to strike
 * through.
 *
 * NOT `product.price`, which is the NET price: `final_price = price +
 * vat - discount`, so on a VAT-bearing product the net is lower than
 * the final and striking it showed the price going UP. Pre-discount and
 * VAT-inclusive is `finalPrice + discountValue`.
 */
const wasPrice = computed(() => {
  if (isWholesalePrice.value) return product.value?.finalPrice

  const discount = Number(product.value?.discountValue ?? 0)
  return discount > 0 ? (product.value?.finalPrice ?? 0) + discount : undefined
})

/**
 * The product's name in the best language it EXISTS in.
 *
 * `extractTranslated` answers only "is there a translation in THIS
 * locale", and a product that has not been translated yet returned
 * `undefined` — which rendered an EMPTY `<h1>` while the `<title>` tag,
 * which falls back to `seoTitle`, carried the name. That is a page with
 * no heading, and it happens to every product the day a store turns on
 * a second locale.
 */
const productName = computed(() =>
  resolveTranslated(product.value, 'name', locale.value, [
    tenantStore.defaultLocale,
  ])?.value
  || product.value?.seoTitle
  || '',
)

/** `reviewAverage` is the model's 1..10; stars are the 5 a reader expects. */
const ratingOutOfFive = computed(() => (product.value?.reviewAverage ?? 0) / 2)

const openModal = () => {
  if (user?.value) {
    isReviewModalOpen.value = true
  }
  else {
    isLoginModalOpen.value = true
    toast.add({
      title: t('must_be_logged_in'),
      color: 'error',
    })
  }
}

const productTitle = computed(() => {
  return capitalize(
    product.value?.seoTitle
    || extractTranslated(product?.value, 'name', locale.value)
    || '',
  )
})

const productDescription = computed(() => {
  const seoDesc = product.value?.seoDescription
  if (seoDesc) return seoDesc

  const rawDescription = extractTranslated(product?.value, 'description', locale.value) || ''
  return stripHtmlTags(rawDescription).slice(0, 160)
})

const productStock = computed(() => product.value?.stock || 0)
const showStickyAddToCart = computed(() => scrollY.value > 350)

// Record this PDP visit in the recently-viewed history once we have
// translated data to cache. `onMounted` guarantees we're on the client
// (localStorage is unavailable during SSR) and re-triggers when the
// user navigates between PDPs without a full reload.
onMounted(() => {
  if (!product.value?.id) return
  recentlyViewed.add({
    id: product.value.id,
    slug: product.value.slug ?? null,
    name: extractTranslated(product.value, 'name', locale.value) || '',
    mainImagePath: product.value.mainImagePath ?? null,
    finalPrice: typeof product.value.finalPrice === 'number'
      ? product.value.finalPrice
      : null,
    addedAt: Date.now(),
  })
})

const canonicalUrl = computed(() => {
  // Read from siteConfig.url so the canonical, ogUrl, and hreflang
  // alternates all point at the active tenant's primary domain (set
  // by ``server/middleware/4.tenant-site-config.ts``). Reading
  // ``runtimeConfig.public.baseUrl`` would always emit the platform
  // base URL for every tenant.
  const baseUrl = siteConfig.url || runtimeConfig.public.baseUrl
  return `${baseUrl}/products/${product.value?.id}/${product.value?.slug}`
})

const ogImage = computed(() => {
  if (!product.value?.mainImagePath) return ''

  return img(product.value.mainImagePath, {
    width: 1200,
    height: 630,
    fit: 'cover',
    format: 'png',
  }, {
    provider: 'mediaStream',
  })
})

const productAvailability = computed(() => {
  const stock = productStock.value
  if (stock === 0) return 'https://schema.org/OutOfStock'
  if (stock <= 5) return 'https://schema.org/LimitedAvailability'
  return 'https://schema.org/InStock'
})

const productCondition = computed(() => 'https://schema.org/NewCondition')

const favouriteId = computed(() => {
  if (!product.value) return
  const favourite = getFavouriteIdByProductId(product.value?.id)
  return favourite
})

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
      params: { id: productId ?? '', slug: product.value?.slug ?? '' },
    }),
    label: productTitle.value,
  },
])

const reviewButtonText = computed(() => {
  if (userHadReviewed.value) {
    return t('update_review')
  }
  return t('write_review')
})

const shareOptions = reactive({
  title: extractTranslated(product.value, 'name', locale.value) || '',
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

const productSpecifications = computed(() => {
  const specs = []

  if (product.value?.weight) {
    specs.push({
      label: t('weight'),
      value: `${product.value.weight.value} ${product.value.weight.unit || 'kg'}`,
    })
  }

  // Add product attributes
  if (product.value?.attributes && product.value.attributes.length > 0) {
    product.value.attributes.forEach((attr) => {
      specs.push({
        label: attr.attributeName,
        value: attr.value,
      })
    })
  }

  return specs
})

useSeoMeta({
  title: () => productTitle.value,
  description: () => productDescription.value,

  ogTitle: () => productTitle.value,
  ogDescription: () => productDescription.value,
  ogImage: () => ogImage.value,
  ogImageWidth: 1200,
  ogImageHeight: 630,
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
    const links = [
      {
        rel: 'canonical',
        href: canonicalUrl.value,
      },
    ] as const
    // Preload the hero image so it's in flight before render — cuts
    // ~200-400ms off LCP on cold product detail pages.
    const heroHref = ogImage.value
    if (!heroHref) return [...links]
    return [
      ...links,
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
      content: product.value?.seoKeywords || productTitle.value,
    },
  ],
})

useSchemaOrg([
  // Object-valued schema properties (image, offers, aggregateRating,
  // review) may no longer be per-property getters since the
  // @unhead/schema-org v3 definer-type rewrite — reactive nodes must be
  // a single computed() over plain values instead.
  defineProduct(computed(() => {
    const images = (productImages.value ?? [])
      .map(img => img.imageUrl)
      .filter((path): path is string => Boolean(path))

    const priceValidUntilDate = new Date()
    priceValidUntilDate.setDate(priceValidUntilDate.getDate() + 30)

    const reviews = productReviews.value?.results ?? []

    return {
      name: extractTranslated(product.value, 'name', locale.value) || '',
      description: stripHtmlTags(extractTranslated(product.value, 'description', locale.value) || ''),
      sku: product.value?.uuid || '',
      productID: product.value?.id?.toString() || '',

      image: images.length > 0 ? images : undefined,

      url: canonicalUrl.value,

      category: product.value?.category?.toString() || undefined,

      brand: {
        '@type': 'Brand',
        'name': siteConfig.name,
      },

      offers: {
        '@type': 'Offer' as const,
        'price': (product.value?.finalPrice || 0).toFixed(2),
        'priceCurrency': 'EUR',
        'availability': productAvailability.value,
        'itemCondition': productCondition.value,
        'url': canonicalUrl.value,
        'priceValidUntil': priceValidUntilDate.toISOString().split('T')[0],
        'seller': {
          '@type': 'Organization',
          'name': siteConfig.name,
        },
        'hasMerchantReturnPolicy': {
          '@type': 'MerchantReturnPolicy',
          'applicableCountry': 'GR',
          'returnPolicyCategory': 'https://schema.org/MerchantReturnFiniteReturnWindow',
          'merchantReturnDays': 14,
          'returnMethod': 'https://schema.org/ReturnByMail',
          'returnFees': 'https://schema.org/ReturnFeesCustomerResponsibility',
        },
        'shippingDetails': {
          '@type': 'OfferShippingDetails',
          'shippingRate': {
            '@type': 'MonetaryAmount',
            'value': 0,
            'currency': 'EUR',
          },
          'shippingDestination': {
            '@type': 'DefinedRegion',
            'addressCountry': 'GR',
          },
          'deliveryTime': {
            '@type': 'ShippingDeliveryTime',
            'handlingTime': {
              '@type': 'QuantitativeValue',
              'minValue': 0,
              'maxValue': 1,
              'unitCode': 'DAY',
            },
            'transitTime': {
              '@type': 'QuantitativeValue',
              'minValue': 3,
              'maxValue': 5,
              'unitCode': 'DAY',
            },
          },
        },
      },

      aggregateRating: product.value?.reviewCount && product.value.reviewCount > 0
        ? {
            '@type': 'AggregateRating' as const,
            'ratingValue': product.value.reviewAverage || 0,
            'reviewCount': product.value.reviewCount,
            'bestRating': 10,
            'worstRating': 1,
          }
        : undefined,

      review: reviews.length > 0
        ? reviews.slice(0, 5).map(r => ({
            '@type': 'Review' as const,
            'author': {
              '@type': 'Person' as const,
              'name': [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ') || 'Anonymous',
            },
            'reviewRating': {
              '@type': 'Rating' as const,
              'ratingValue': r.rate,
              'bestRating': 10,
              'worstRating': 1,
            },
            'datePublished': r.publishedAt || r.createdAt,
            'reviewBody': extractTranslated(r, 'comment', locale.value) || undefined,
          }))
        : undefined,
    }
  })),

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
  <div v-if="product">
    <UContainer class="pt-6">
      <UBreadcrumb :items="items" />
    </UContainer>

    <!-- The two columns of a product page: what it looks like, and
         everything needed to decide. -->
    <UContainer class="pt-6 pb-12">
      <div
        class="
          grid gap-8
          lg:grid-cols-12 lg:gap-12
        "
      >
        <div class="lg:col-span-7">
          <ProductImages :product="product" />
        </div>

        <!-- min-w-0: below lg this is a grid item in an implicit `auto`
             track, whose min-width:auto otherwise inflates the track to
             the min-content of the non-wrapping variant carousel and
             blows the page out sideways on a phone. -->
        <div
          class="
            flex min-w-0 flex-col gap-5
            lg:sticky lg:top-24 lg:col-span-5 lg:self-start
          "
        >
          <div class="flex flex-col gap-2">
            <p
              v-if="product.brandName"
              class="text-xs font-medium tracking-wide text-muted uppercase"
            >
              {{ product.brandName }}
            </p>

            <h1
              class="
                font-display text-2xl font-semibold tracking-tight
                text-highlighted text-balance
                sm:text-3xl
              "
            >
              {{ productName }}
            </h1>

            <div class="flex flex-wrap items-center gap-3">
              <a
                v-if="product.reviewCount"
                href="#reviews"
                class="flex items-center gap-1.5"
              >
                <UInputRating
                  :model-value="ratingOutOfFive"
                  :length="5"
                  :step="0.5"
                  size="xs"
                  color="warning"
                  readonly
                />
                <span
                  class="
                    text-sm text-muted underline-offset-2
                    hover:underline
                  "
                >
                  {{ t('n_reviews', { count: product.reviewCount }) }}
                </span>
              </a>

              <UBadge
                :color="stockStatus.color"
                :icon="stockStatus.icon"
                size="sm"
                variant="subtle"
                :label="stockStatus.label"
              />
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <div class="flex flex-wrap items-baseline gap-x-3">
              <span
                class="
                  font-mono text-3xl font-semibold tabular-nums
                  text-highlighted
                "
              >
                {{ formatProductPrice(displayFinalPrice) }}
              </span>
              <span
                v-if="wasPrice"
                class="font-mono text-lg tabular-nums text-dimmed line-through"
              >
                {{ formatProductPrice(wasPrice) }}
              </span>
              <UBadge
                v-if="product.discountPercent && product.discountPercent > 0"
                color="error"
                variant="solid"
                size="sm"
                :label="`-${Math.round(product.discountPercent)}%`"
              />
            </div>
            <span class="text-xs text-dimmed">{{ t('vat_included') }}</span>
          </div>

          <!-- Colour / length / capacity. Renders nothing unless the
               product belongs to a variant group. -->
          <ProductVariantSelector :product="product" />

          <!-- Promotions that apply to THIS product, resolved by Django
               against the same rules the cart engine uses. An automatic
               offer is otherwise invisible until the cart already
               qualifies for it. -->
          <ProductOffers
            v-if="product.id"
            :product-id="product.id"
          />

          <LoyaltyPointsBadge
            v-if="loggedIn && product.id"
            :product-id="product.id"
          />
          <ProductGuestLoyaltyCTA
            v-else-if="product.finalPrice"
            :product-price="product.finalPrice"
          />

          <div class="flex items-stretch gap-3">
            <label
              class="sr-only"
              for="quantity"
            >{{ t('qty') }}</label>
            <UInputNumber
              id="quantity"
              v-model="selectorQuantity"
              :min="1"
              :max="product.stock"
              :disabled="productStock === 0"
              size="xl"
              class="w-32 shrink-0"
            />
            <ButtonProductAddToCart
              :product="product"
              :quantity="selectorQuantity || 1"
              :text="t('add_to_cart')"
              size="xl"
              class="w-full"
            />
          </div>

          <div class="flex flex-wrap items-center gap-1">
            <ButtonProductAddToFavourite
              :favourite-id="favouriteId"
              :product-id="product.id"
              :user-id="user?.id"
              variant="ghost"
            />
            <ClientOnly>
              <UButton
                v-if="isSupported"
                :label="t('share')"
                color="neutral"
                variant="ghost"
                icon="i-heroicons-share"
                @click="startShare"
              />
            </ClientOnly>
          </div>

          <ShippingFreeShippingNotice />

          <!-- Out of stock is a dead end. The restock alert is offered
               where the shopper learns the news. -->
          <ProductNotifyMe
            v-if="productAlertsEnabled && productStock === 0 && product.id"
            :product-id="product.id"
            kind="restock"
          />

          <!-- Price-drop alerts are independent of stock, and opt-in per
               SKU: admins choose which products can promise one. The
               target price is validated below the current final price so
               the alert does not fire immediately. -->
          <ProductNotifyMe
            v-if="productAlertsEnabled && product.id && product.priceDropAlertsEnabled && (product.finalPrice ?? 0) > 0"
            :product-id="product.id"
            kind="price_drop"
            :current-price="product.finalPrice"
          />
        </div>
      </div>
    </UContainer>

    <!-- Below the fold the page is bands again, full width, so the
         description and the reviews are not squeezed into the buy box's
         column the way they were. -->
    <PageSectionBand surface="muted">
      <UTabs
        v-if="!isMobileOrTablet"
        :items="productTabs"
        color="neutral"
        variant="link"
        class="w-full"
      >
        <template #description>
          <ProductDescriptionPanel :html="sanitizedDescription" />
        </template>
        <template #specifications>
          <ProductSpecificationsPanel :specifications="productSpecifications" />
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
          <ProductDescriptionPanel
            v-if="item.value === 'description'"
            :html="sanitizedDescription"
          />
          <ProductSpecificationsPanel
            v-else-if="item.value === 'specifications'"
            :specifications="productSpecifications"
          />
        </template>
      </UAccordion>
    </PageSectionBand>

    <!-- A product that cannot be bought gets replacements instead of
         related items; the engine's own slot decides which. -->
    <PageSectionBand v-if="suggestionsEnabled && product.id">
      <LazyProductSuggestions
        :surface="productStock === 0 ? 'out_of_stock' : 'pdp'"
        :seed-id="product.id"
        hydrate-on-visible
      />
    </PageSectionBand>

    <PageSectionBand
      v-if="productReviewsEnabled"
      id="reviews"
      surface="muted"
    >
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <h2
            class="
              font-display text-2xl font-semibold tracking-tight
              text-highlighted
              md:text-3xl
            "
          >
            {{ t('reviews.title') }}
          </h2>
          <UButton
            :label="reviewButtonText"
            color="neutral"
            variant="outline"
            icon="i-heroicons-pencil-square"
            @click="openModal"
          />
        </div>
      </template>

      <ProductReviewsList
        :reviews="productReviews?.results ?? []"
        :reviews-average="product.reviewAverage"
        :reviews-count="product.reviewCount"
        display-image-of="user"
      />
    </PageSectionBand>

    <ProductReview
      v-if="user && productReviewsEnabled"
      v-model:open="isReviewModalOpen"
      :user-product-review="userProductReview"
      :user-had-reviewed="userHadReviewed"
      :product="product"
      :user="user"
      @add-existing-review="onAddExistingReview"
      @update-existing-review="onUpdateExistingReview"
      @delete-existing-review="onDeleteExistingReview"
    />

    <!-- The buy bar that follows the shopper once the real one has
         scrolled away. Client-only: it depends on the scroll position,
         which no cached anonymous render can know. -->
    <ClientOnly>
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="translate-y-full"
        leave-active-class="transition duration-150"
        leave-to-class="translate-y-full"
      >
        <div
          v-if="stickyAddToCartEnabled && showStickyAddToCart"
          class="
            fixed inset-x-0 bottom-18 z-40 border-t border-default
            bg-default/95 pb-[env(safe-area-inset-bottom)] backdrop-blur
            md:bottom-0
          "
        >
          <UContainer class="flex items-center gap-4 py-3">
            <ProductImage
              v-if="productImages && productImages[0]"
              :key="product.id"
              :image="productImages[0]"
              :width="64"
              :height="64"
              class="
                hidden size-12 shrink-0 rounded-lg bg-elevated object-contain
                sm:block
              "
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ productTitle }}
              </p>
              <p class="font-mono text-base font-semibold tabular-nums">
                {{ formatProductPrice(displayFinalPrice) }}
              </p>
            </div>
            <ButtonProductAddToCart
              :product="product"
              :quantity="selectorQuantity || 1"
              :text="t('add_to_cart')"
              size="lg"
              class="shrink-0"
            />
          </UContainer>
        </div>
      </Transition>
    </ClientOnly>
  </div>
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
  must_be_logged_in: Πρέπει να συνδεθείς
  update_review: Ενημέρωση κριτικής
  write_review: Γράψε κριτική
  n_reviews: "{count} αξιολόγηση | {count} αξιολογήσεις"
  reviews:
    title: Αξιολογήσεις
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
en:
  breadcrumb:
    items:
      products:
        label: Products
  product_id: Product ID
  qty: Quantity
  share: Share it
  max_quantity_reached: Maximum quantity reached
  must_be_logged_in: You have to sign in
  update_review: Update the review
  write_review: Write a review
  n_reviews: "{count} review | {count} reviews"
  reviews:
    title: Reviews
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
</i18n>
