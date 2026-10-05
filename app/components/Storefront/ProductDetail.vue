<script lang="ts" setup>
import type { AccordionItem, TabsItem } from '#ui/types'

const { t, locale, n } = useI18n()
const route = useRoute(`products-id-slug___${locale.value}`)

const { isMobileOrTablet } = useDevice()
// Merchant UI toggle — fails OPEN so the purchase CTA never
// disappears on a settings hiccup.
const stickyAddToCartEnabled = useSettingFlag('STICKY_ADD_TO_CART_ENABLED', {
  fallback: true,
})
// The sticky bar floats above the phone's tab bar when there is one.
const mobileBottomNavEnabled = useSettingFlag('MOBILE_BOTTOM_NAV_ENABLED', {
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
// "Order before 15:00, ships the same business day": the store's cutoff
// is one cached public setting, so it renders on the server like the
// rest of the page. No "today"/"tomorrow": that needs the visitor's
// clock and Django's holiday calendar, and this page is cached.
const dispatchCutoffSetting = useSettingValue('DISPATCH_CUTOFF')
const dispatchCutoff = computed(() => parseDispatchCutoff(dispatchCutoffSetting.value))
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
const cartStore = useCartStore()

const isReviewModalOpen = ref(false)
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

const { data: product, error: productError, refresh: refreshProduct } = await useApi<ProductRetrieve>(
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

// Images, reviews and the category list in parallel — all three are
// needed for SSR (the gallery, the review section, Schema.org and the
// breadcrumb). The category list is the header menu's, already fetched.
const [
  { data: productImages },
  { data: productReviews, refresh: refreshProductReviews },
  { data: allCategories },
] = await Promise.all([
  useApi(
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
  useApi(
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
  useAllCategories(),
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
const { execute: fetchFavourites } = useLazyApi('/api/products/favourites/favourites-by-products', {
  key: `favouritesByProducts${user.value?.id}`,
  method: 'POST',
  body: {
    productIds: [Number(productId)],
  },
  // `watch: false` for the same reason as Products/List.vue: nothing
  // here is reactive today, but that is one edit away from refetching
  // an auth-required endpoint for anonymous visitors.
  watch: false,
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
  = useLazyApi(`/api/products/reviews/${productId}/user-product-review`, {
    key: `productReviews${productId}${user.value?.id}`,
    method: 'GET',
    immediate: loggedIn.value,
    server: false, // Client-side only - user-specific data
  })

const userHadReviewed = computed(() => !!userProductReview.value)

/**
 * The review list: three at first, as the design draws it, then every
 * review of the first page, then a page more per click. The first page
 * is the server's (it also feeds Schema.org); later pages are fetched
 * on demand and appended.
 */
const REVIEWS_FIRST = 3
const reviewsExpanded = ref(false)
const reviewPages = ref<ProductReview[][]>([])
const loadingReviews = ref(false)
const loadedReviews = computed(() => [
  ...(productReviews.value?.results ?? []),
  ...reviewPages.value.flat(),
])
const visibleReviews = computed(() =>
  reviewsExpanded.value ? loadedReviews.value : loadedReviews.value.slice(0, REVIEWS_FIRST),
)
const reviewsTotal = computed(() => productReviews.value?.count ?? 0)
const moreReviews = computed(() => reviewsTotal.value > visibleReviews.value.length)

async function showMoreReviews() {
  if (!reviewsExpanded.value) {
    reviewsExpanded.value = true
    if (loadedReviews.value.length > REVIEWS_FIRST) return
  }
  if (loadingReviews.value) return
  loadingReviews.value = true
  try {
    const page = await $api(`/api/products/${productId}/reviews`, {
      query: { languageCode: locale.value, page: reviewPages.value.length + 2 },
    })
    reviewPages.value = [...reviewPages.value, page.results ?? []]
  }
  catch (error) {
    log.error({ action: 'reviews:loadMore', error })
    toast.add({ title: t('reviews.load_error'), color: 'error' })
  }
  finally {
    loadingReviews.value = false
  }
}

// The review widget used to refetch a list of its own that nothing
// rendered; the list on THIS page is the one that must move.
const onReviewChanged = async () => {
  reviewPages.value = []
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

// What the shopper would otherwise have paid — the number to strike
// through (see productWasPrice for why it is not `product.price`).
const wasPrice = computed(() =>
  product.value ? productWasPrice(product.value, displayFinalPrice.value ?? product.value.finalPrice) : undefined,
)

/**
 * The product's name in the best language it EXISTS in.
 *
 * `extractTranslated` answers only "is there a translation in THIS
 * locale", and a product that has not been translated yet returned
 * `undefined` — which rendered an EMPTY `<h1>` while the `<title>` tag,
 * which falls back to the SEO title, carried the name. That is a page with
 * no heading, and it happens to every product the day a store turns on
 * a second locale.
 */
const productName = computed(() =>
  resolveTranslated(product.value, 'name', locale.value, [
    tenantStore.defaultLocale,
  ])?.value
  || extractTranslated(product.value, 'seoTitle', locale.value)
  || '',
)

/** `reviewAverage` is the model's 1..10; stars are the 5 a reader expects. */
const ratingOutOfFive = computed(() => (product.value?.reviewAverage ?? 0) / 2)
const ratingText = computed(() =>
  n(ratingOutOfFive.value, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
)

/** A guest is sent to sign in, and brought back to the reviews. */
const signInToReview = computed(() =>
  localePath({ name: RedirectToURLs.LOGIN_URL, query: { next: `${route.fullPath.split('#')[0]}#reviews` } }),
)

const productTitle = computed(() => {
  return capitalize(
    extractTranslated(product.value, 'seoTitle', locale.value)
    || extractTranslated(product?.value, 'name', locale.value)
    || '',
  )
})

const productDescription = computed(() => {
  const seoDesc = extractTranslated(product.value, 'seoDescription', locale.value)
  if (seoDesc) return seoDesc

  const rawDescription = extractTranslated(product?.value, 'description', locale.value) || ''
  return stripHtmlTags(rawDescription).slice(0, 160)
})

const productStock = computed(() => product.value?.stock || 0)

// The sticky bar takes over once the buy row has scrolled up out of
// view — not merely off-screen: on a phone the row starts below the
// fold, under the photograph, and the bar must not cover it there.
const buyRow = useTemplateRef<HTMLElement>('buyRow')
const { bottom: buyRowBottom } = useElementBounding(buyRow)
const showStickyAddToCart = computed(() => buyRowBottom.value < 0)

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

/**
 * Where the product sits in the catalogue: its category's trail from the
 * root, as the design draws it (Home › Charging › Power banks › the
 * product). A product without a category sits under the full listing.
 */
const categoryPath = computed(() => {
  const id = product.value?.category
  if (!id) return []
  return categoryTrail(buildCategoryForest(allCategories.value ?? [], locale.value, undefined), id)
})
const parentCrumbs = computed(() =>
  categoryPath.value.length
    ? categoryPath.value.map(node => ({ label: node.label, to: node.to }))
    : [{ label: t('breadcrumb.items.products.label'), to: '/products' }],
)
const breadcrumb = computed(() => [...parentCrumbs.value, { label: productName.value }])

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

/**
 * The stock line under the variants. The dot and the words carry the
 * status together, in the Volt status colours, which read as text.
 */
const stockLine = computed(() => {
  if (productStock.value <= 0) return { label: t('out_of_stock'), tone: 'text-error', dot: 'bg-error' }
  const left = product.value ? lowStockLeft(product.value) : null
  if (left) return { label: t('low_stock', { count: left }, left), tone: 'text-warning', dot: 'bg-warning' }
  return { label: t('in_stock'), tone: 'text-success', dot: 'bg-success' }
})

/** What the discount saves, beside the struck price. */
const saving = computed(() =>
  wasPrice.value && displayFinalPrice.value !== undefined
    ? wasPrice.value - displayFinalPrice.value
    : 0,
)

const priceDropOffered = computed(() =>
  productAlertsEnabled.value
  && !!product.value?.priceDropAlertsEnabled
  && (product.value?.finalPrice ?? 0) > 0,
)

/**
 * The alerts dialog, mounted on its first open: the shopper's alerts
 * are looked up only for a shopper who asked.
 */
const notify = reactive({ mounted: false, open: false, kind: 'restock' as ProductAlertKindEnum })
function openNotify(kind: ProductAlertKindEnum) {
  notify.kind = kind
  notify.mounted = true
  notify.open = true
}

// TabsItem's value may be a number, AccordionItem's may not: two lists.
const productTabs = computed<TabsItem[]>(() => [
  { label: t('description'), value: 'description', slot: 'description' },
  { label: t('specifications'), value: 'specifications', slot: 'specifications' },
])
const productAccordionItems = computed<AccordionItem[]>(() => [
  { label: t('description'), value: 'description' },
  { label: t('specifications'), value: 'specifications' },
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

// The LCP photograph is preloaded by the gallery itself, at the exact
// URL and srcset its <img> asks for; preloading the 1200x630 social
// card here fetched an image no element on the page shows.
useHead({
  link: () => [
    {
      rel: 'canonical',
      href: canonicalUrl.value,
    },
  ],
  meta: [
    {
      name: 'keywords',
      content: extractTranslated(product.value, 'seoKeywords', locale.value)
        || productTitle.value,
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
              // The name the page shows: first name and initial.
              'name': reviewerName(r.user) ?? t('reviews.anonymous'),
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

  // The trail the page shows.
  defineBreadcrumb(computed(() => ({
    itemListElement: [
      {
        name: t('breadcrumb.items.index.label'),
        item: localePath('index'),
      },
      ...parentCrumbs.value.map(crumb => ({
        name: crumb.label,
        item: localePath(crumb.to),
      })),
      {
        name: productName.value,
        item: canonicalUrl.value,
      },
    ],
  }))),
])
</script>

<template>
  <!-- `data-action-bar` tells the footer to keep its last line clear of
       the sticky buy bar (Chrome/Footer.vue). -->
  <div
    v-if="product"
    :data-action-bar="stickyAddToCartEnabled ? '' : undefined"
  >
    <UContainer class="pt-6 max-sm:hidden">
      <PageBreadcrumb :items="breadcrumb" />
    </UContainer>

    <!-- The two columns of a product page: what it looks like, and
         everything needed to decide. -->
    <UContainer
      class="
        pb-14
        sm:pt-6
        lg:pb-22
      "
    >
      <div
        class="
          grid gap-5
          lg:grid-cols-[7fr_5fr] lg:gap-16
        "
      >
        <ProductImages
          :product="product"
          :product-name="productName"
        />

        <!-- min-w-0: below lg this is a grid item in an implicit `auto`
             track, whose min-width:auto otherwise inflates the track to
             the min-content of its widest row and blows the page out
             sideways on a phone. -->
        <div
          class="
            flex min-w-0 flex-col gap-5.5
            lg:sticky lg:top-24 lg:self-start
          "
        >
          <div class="flex flex-col gap-2.5">
            <p
              v-if="product.brandName"
              class="text-xs font-bold tracking-[0.08em] text-muted uppercase"
            >
              {{ product.brandName }}
            </p>

            <h1
              class="
                font-display text-[1.875rem]/[1.08] font-bold tracking-[-0.02em]
                text-highlighted text-balance
                lg:text-[2.5rem]/[1.08]
              "
            >
              {{ productName }}
            </h1>

            <a
              v-if="productReviewsEnabled && product.reviewCount"
              href="#reviews"
              class="flex items-center gap-1.5 self-start"
            >
              <UInputRating
                :model-value="ratingOutOfFive"
                :step="0.5"
                size="xs"
                color="primary"
                icon="i-heroicons-star-solid"
                :ui="{ emptyIcon: 'text-(--ui-border-accented)' }"
                readonly
                :aria-label="t('rated', { n: ratingText })"
              />
              <span
                class="
                  text-[0.8125rem] font-semibold text-muted underline-offset-2
                  hover:underline
                "
              >
                {{ ratingText }} · {{ t('n_reviews', { count: product.reviewCount }, product.reviewCount) }}
              </span>
            </a>
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex flex-wrap items-baseline gap-x-2">
                <span
                  class="
                    font-mono text-[1.875rem] font-bold tabular-nums
                    text-highlighted
                    lg:text-4xl
                  "
                >
                  {{ formatProductPrice(displayFinalPrice) }}
                </span>
                <span
                  v-if="wasPrice"
                  class="
                    font-mono text-[1.4375rem] tabular-nums text-muted line-through
                    lg:text-[1.6875rem]
                  "
                >
                  {{ formatProductPrice(wasPrice) }}
                </span>
              </div>
              <UBadge
                v-if="saving > 0"
                :label="t('save', { amount: formatProductPrice(saving) })"
                color="neutral"
                class="bg-volt text-on-volt"
              />
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-[0.8125rem] text-muted">{{ t('vat_included') }}</span>
              <LoyaltyPointsBadge
                v-if="displayFinalPrice"
                :product-id="product.id"
                :product-price="displayFinalPrice"
              />
            </div>
          </div>

          <!-- Colour / length / capacity. Renders nothing unless the
               product belongs to a variant group. -->
          <ProductVariantSelector :product="product" />

          <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p
              class="flex items-center gap-2 text-sm font-bold"
              :class="stockLine.tone"
            >
              <span
                class="size-2 rounded-full"
                :class="stockLine.dot"
              />
              {{ stockLine.label }}
            </p>
            <p
              v-if="dispatchCutoff && productStock > 0"
              class="text-sm text-toned"
            >
              {{ t('dispatch_before', { time: dispatchCutoff }) }}
            </p>
            <!-- Out of stock is a dead end; the restock alert is offered
                 where the shopper learns the news. -->
            <UButton
              v-if="productAlertsEnabled && productStock === 0"
              :label="t('notify_me')"
              icon="i-lucide-bell"
              color="neutral"
              variant="outline"
              size="sm"
              @click="openNotify('restock')"
            />
          </div>

          <div
            ref="buyRow"
            class="flex items-stretch gap-2.5"
          >
            <label
              class="sr-only"
              for="quantity"
            >{{ t('qty') }}</label>
            <UInputNumber
              id="quantity"
              v-model="selectorQuantity"
              :min="1"
              :max="product.stock || 1"
              :disabled="productStock === 0"
              :increment="{ color: 'neutral', variant: 'ghost', size: 'md' }"
              :decrement="{ color: 'neutral', variant: 'ghost', size: 'md' }"
              :ui="{
                root: 'w-32 shrink-0',
                base: `
                  h-13 rounded-full bg-default text-center font-mono font-bold
                `,
              }"
            />
            <ButtonProductAddToCart
              :product="product"
              :quantity="selectorQuantity || 1"
              :text="t('add_to_cart')"
              size="lg"
              class="min-w-0 flex-1"
            />
            <ButtonProductAddToFavourite
              :favourite-id="favouriteId"
              :product-id="product.id"
              :user-id="user?.id"
              size="lg"
              variant="outline"
              square
            />
          </div>

          <!-- The cart is per visitor and this page is cached. A visitor
               without a cart is 0 € into the threshold. -->
          <ClientOnly>
            <ShippingFreeShippingNotice
              v-if="cartStore.loaded"
              :cart-total="cartStore.cart?.totalPrice ?? 0"
            />
          </ClientOnly>

          <!-- Promotions that apply to THIS product, resolved by Django
               against the same rules the cart engine uses. BELOW the buy
               controls: nothing in the panel is worth the primary action
               of the page (test/unit/source-rules/buy-box-order.spec.ts). -->
          <ProductOffers :product-id="product.id" />

          <div class="flex flex-wrap gap-2">
            <ClientOnly>
              <UButton
                v-if="isSupported"
                :label="t('share')"
                icon="i-lucide-share-2"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="startShare"
              />
            </ClientOnly>
            <!-- Price-drop alerts are opt-in per product: the merchant
                 chooses which products can promise one. -->
            <UButton
              v-if="priceDropOffered"
              :label="t('price_drop_alert')"
              icon="i-lucide-bell"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="openNotify('price_drop')"
            />
          </div>
        </div>
      </div>
    </UContainer>

    <!-- Desk: tabs on a white band, the description beside the
         specifications. Phone: the same as an accordion on the ground. -->
    <PageSectionBand v-if="!isMobileOrTablet">
      <UTabs
        :items="productTabs"
        default-value="description"
        color="neutral"
        variant="link"
        :unmount-on-hide="false"
        class="w-full gap-8"
        :ui="{
          list: 'gap-7 p-0',
          trigger: 'h-10 px-1 py-0 text-[0.9375rem] font-semibold',
          indicator: 'h-0.5',
        }"
      >
        <template #description>
          <div
            class="grid gap-16"
            :class="productSpecifications.length ? 'grid-cols-[1.2fr_1fr]' : undefined"
          >
            <ProductDescriptionPanel :html="sanitizedDescription" />
            <ProductSpecificationsPanel
              v-if="productSpecifications.length"
              :specifications="productSpecifications"
            />
          </div>
        </template>
        <template #specifications>
          <div class="max-w-3xl">
            <ProductSpecificationsPanel :specifications="productSpecifications" />
          </div>
        </template>
      </UTabs>
    </PageSectionBand>
    <UContainer
      v-else
      class="pt-8"
    >
      <UAccordion
        :items="productAccordionItems"
        default-value="description"
        type="single"
        :ui="{
          root: 'border-t border-default',
          item: 'border-b border-default',
          trigger: 'py-4.5 text-base font-bold text-highlighted',
          body: 'pb-4.5',
        }"
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
    </UContainer>

    <PageSectionBand
      v-if="productReviewsEnabled"
      id="reviews"
      surface="muted"
      class="scroll-mt-24"
    >
      <div
        class="
          grid gap-6
          lg:grid-cols-[20rem_1fr] lg:gap-16
        "
      >
        <div class="flex flex-col items-start gap-4">
          <h2
            class="
              font-display text-[1.625rem] font-bold tracking-[-0.02em]
              text-highlighted
              lg:text-[2rem]
            "
          >
            {{ t('reviews.title') }}
          </h2>
          <ProductReviewsOverview
            :average="product.reviewAverage"
            :count="product.reviewCount"
            :distribution="product.ratingDistribution"
          />
          <UButton
            v-if="user"
            :label="userHadReviewed ? t('update_review') : t('write_review')"
            icon="i-lucide-pen-line"
            class="mt-1.5"
            @click="() => { isReviewModalOpen = true }"
          />
          <UButton
            v-else
            :label="t('write_review')"
            icon="i-lucide-pen-line"
            :to="signInToReview"
            class="mt-1.5"
          />
        </div>

        <div
          v-if="visibleReviews.length"
          class="flex flex-col items-start"
        >
          <ProductReviewsItem
            v-for="review in visibleReviews"
            :key="review.id"
            :review="review"
            class="self-stretch"
          />
          <UButton
            v-if="moreReviews"
            :label="reviewsExpanded ? t('reviews.more') : t('reviews.all', { count: reviewsTotal }, reviewsTotal)"
            color="neutral"
            variant="outline"
            :loading="loadingReviews"
            class="mt-5"
            @click="showMoreReviews"
          />
        </div>
      </div>
    </PageSectionBand>

    <!-- A product that cannot be bought gets replacements instead of
         related items; the engine's own slot decides which. -->
    <LazyProductSuggestions
      v-if="suggestionsEnabled"
      band
      :surface="productStock === 0 ? 'out_of_stock' : 'pdp'"
      :seed-id="product.id"
      hydrate-on-visible
    />

    <ProductReview
      v-if="user && productReviewsEnabled"
      v-model:open="isReviewModalOpen"
      :user-product-review="userProductReview"
      :user-had-reviewed="userHadReviewed"
      :product="product"
      :product-name="productName"
      :user="user"
      @add-existing-review="onAddExistingReview"
      @update-existing-review="onUpdateExistingReview"
      @delete-existing-review="onDeleteExistingReview"
    />

    <LazyProductNotifyMe
      v-if="notify.mounted"
      v-model:open="notify.open"
      v-model:kind="notify.kind"
      :product-id="product.id"
      :product-name="productName"
      :product-image="product.mainImagePath"
      :sold-out="productStock === 0"
      :price-drop="priceDropOffered"
      :current-price="displayFinalPrice ?? null"
    />

    <!-- The buy bar that follows the shopper once the buy row has
         scrolled away: a floating card above the phone's tab bar, centred
         at the foot of a desktop. Client-only: it depends on the scroll
         position, which no cached anonymous render can know. -->
    <ClientOnly>
      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="translate-y-[calc(100%+1.5rem)] opacity-0"
        leave-active-class="transition duration-150"
        leave-to-class="translate-y-[calc(100%+1.5rem)] opacity-0"
      >
        <div
          v-if="stickyAddToCartEnabled && showStickyAddToCart"
          class="
            fixed inset-x-3 z-40 flex items-center gap-3 rounded-[1.125rem]
            border border-default bg-default py-2.5 ps-4 pe-2.5
            shadow-(--ui-overlay-shadow)
            lg:inset-x-0 lg:bottom-6 lg:mx-auto lg:w-xl
          "
          :class="mobileBottomNavEnabled
            ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]'
            : 'bottom-[calc(0.75rem+env(safe-area-inset-bottom))]'"
        >
          <span
            class="
              hidden size-11 shrink-0 overflow-hidden rounded-[0.625rem]
              bg-elevated
              lg:block
            "
          >
            <ProductImage
              v-if="productImages?.[0]"
              :image="productImages[0]"
              :width="44"
              :height="44"
              class="size-full object-cover"
            />
          </span>
          <div class="flex min-w-0 flex-1 flex-col">
            <p class="truncate text-[0.8125rem] font-semibold text-highlighted">
              {{ productName }}
            </p>
            <p class="font-mono text-base font-bold tabular-nums text-highlighted">
              {{ formatProductPrice(displayFinalPrice) }}
            </p>
          </div>
          <ButtonProductAddToCart
            :product="product"
            :quantity="selectorQuantity || 1"
            :text="t('add_to_cart')"
            size="md"
            :block="false"
            class="shrink-0"
          />
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
  qty: Ποσότητα
  share: Κοινοποίηση
  price_drop_alert: Ειδοποίηση πτώσης τιμής
  notify_me: Ειδοποίησέ με
  update_review: Ενημέρωση κριτικής
  write_review: Γράψε κριτική
  rated: Βαθμολογία {n} στα 5
  n_reviews: "{count} αξιολόγηση | {count} αξιολογήσεις"
  save: Κερδίζεις {amount}
  reviews:
    title: Αξιολογήσεις
    all: "Δες την αξιολόγηση | Δες και τις {count} αξιολογήσεις"
    more: Περισσότερες αξιολογήσεις
    load_error: Οι αξιολογήσεις δεν φορτώθηκαν. Δοκίμασε ξανά.
    anonymous: Ανώνυμος πελάτης
  weight: Βάρος
  description: Περιγραφή
  specifications: Προδιαγραφές
  add_to_cart: Στο καλάθι
  out_of_stock: Εξαντλήθηκε
  low_stock: "Έμεινε μόνο {count} | Έμειναν μόνο {count}"
  in_stock: Διαθέσιμο
  dispatch_before: "Παράγγειλε πριν τις {time} (ώρα Ελλάδας) και αποστέλλεται την ίδια εργάσιμη"
  vat_included: Με ΦΠΑ
en:
  breadcrumb:
    items:
      products:
        label: Products
  qty: Quantity
  share: Share
  price_drop_alert: Price-drop alert
  notify_me: Notify me
  update_review: Update your review
  write_review: Write a review
  rated: Rated {n} out of 5
  n_reviews: "{count} review | {count} reviews"
  save: Save {amount}
  reviews:
    title: Reviews
    all: "Show the review | Show all {count} reviews"
    more: More reviews
    load_error: The reviews could not be loaded. Try again.
    anonymous: Anonymous shopper
  weight: Weight
  description: Description
  specifications: Specifications
  add_to_cart: Add to cart
  out_of_stock: Sold out
  low_stock: "Only {count} left | Only {count} left"
  in_stock: In stock
  dispatch_before: "Order before {time} Greek time and it ships the same business day"
  vat_included: VAT included
</i18n>
