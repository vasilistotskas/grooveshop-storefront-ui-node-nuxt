/**
 * Everything a product page needs that is not its drawing: the product,
 * its images and reviews, the 404/503 a missing or failing product
 * becomes, the name, title, description and specifications, the price
 * this shopper pays, the favourite, and the page's client effects (view
 * count, recently viewed, the shopper's favourites, the analytics
 * pixels' view event).
 *
 * Shared by every drawing of the page (`Storefront/ProductDetail.vue` and
 * the tenants' own), so a fix to what the page does lands once. The
 * head, the breadcrumb and the structured data stay with each drawing:
 * they describe what that drawing shows. Call it from a body's
 * `<script setup>`, before the first `await`, with its own `t`: the
 * specification labels are in the drawing's messages.
 */
export async function useProductDetail(productId: string, t: ReturnType<typeof useI18n>['t']) {
  const { locale } = useI18n({ useScope: 'global' })
  // Every store and composable is read before the first await: after
  // one, the server has lost the injection context Pinia needs (see
  // useBlogPostPage), and a hook has no component instance to belong to.
  const tenantStore = useTenantStore()
  const productReviewsEnabled = useStoreFeature('productReviews')
  const { user, loggedIn } = useUserSession()
  const { getFavouriteIdByProductId, updateFavouriteProducts } = useUserStore()
  const { transformImages } = useHtmlContent()
  const img = useMediaStreamImage()
  const recentlyViewed = useRecentlyViewed()
  const metaPixel = useMetaPixel()
  const tiktokPixel = useTikTokPixel()
  const openaiPixel = useOpenAIPixel()
  const ga4 = useGA4()

  // Track product view count (client-side only, fire-and-forget)
  const { trackView } = useViewCount()
  trackView('product', Number(productId))

  // The product, its images and its reviews are requested together: all
  // three are needed for SSR (the gallery, the review section, Schema.org)
  // and need only the id.
  const productRequest = useApi<ProductRetrieve>(`/api/products/${productId}`, {
    key: `product${productId}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      languageCode: locale,
    },
  })
  const imagesRequest = useProductImages(Number(productId))
  const reviewsRequest = useApi<ListProductReviewsResponse>(`/api/products/${productId}/reviews`, {
    key: `productReviewsSchema${productId}`,
    // With reviews off none are fetched, so none reach the page or its
    // structured data (Django answers 404 for them too).
    enabled: productReviewsEnabled,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      languageCode: locale,
      ordering: REVIEW_SORTS[DEFAULT_REVIEW_SORT],
    },
  })
  const { data: product, error: productError, refresh: refreshProduct } = productRequest

  // What the drawings' variant selector and offer panel read, started here
  // so they do not wait for the product, its images and its reviews, then
  // the categories, before their own requests begin (they need only the
  // id). Under the keys and options their composables use, so the panels
  // find the answers already in the render. The variants are asked once the
  // product says it belongs to a group (`execute` below): most products do
  // not, and the call would be wasted on them; the offers do not depend on
  // the product, so they start now.
  const variantsRequest = useProductVariants(Number(productId), () => product.value?.variantGroup)
  const offersRequest = useProductPromotions(Number(productId))
  const { data: productImages } = imagesRequest
  const { data: productReviews, refresh: refreshProductReviews } = reviewsRequest

  /**
   * The product's name in the best language it EXISTS in.
   *
   * Per field rather than per row (`extractTranslated` picks the row's
   * language): the page's `<h1>` stays filled even where the page's
   * language has a translation whose name was left empty.
   */
  const productName = computed(() =>
    resolveTranslated(product.value, 'name', locale.value, [
      tenantStore.defaultLocale,
    ])?.value
    || extractTranslated(product.value, 'seoTitle', locale.value)
    || '',
  )

  const productTitle = computed(() =>
    capitalize(
      extractTranslated(product.value, 'seoTitle', locale.value)
      || productName.value,
    ),
  )

  const productDescription = computed(() => {
    const seoDesc = extractTranslated(product.value, 'seoDescription', locale.value)
    if (seoDesc) return seoDesc

    const rawDescription = extractTranslated(product.value, 'description', locale.value) || ''
    return htmlToPlainText(rawDescription).slice(0, 160)
  })

  const sanitizedDescription = computed(() =>
    transformImages(extractTranslated(product.value, 'description', locale.value) ?? ''),
  )

  const productStock = computed(() => product.value?.stock || 0)

  const productSpecifications = computed(() => {
    const specs = []

    if (product.value?.weight) {
      specs.push({
        label: t('weight'),
        value: `${product.value.weight.value} ${product.value.weight.unit || 'kg'}`,
      })
    }

    for (const attr of product.value?.attributes ?? []) {
      specs.push({
        label: attr.attributeName,
        value: attr.value,
      })
    }

    return specs
  })

  // What this shopper pays and what to strike through: retail renders
  // first, the wholesale price swaps in after hydration (see useShopperPrice).
  const { displayFinalPrice, wasPrice, announcement } = useShopperPrice(() => product.value?.id, product)

  const favouriteId = computed(() =>
    product.value ? getFavouriteIdByProductId(product.value.id) : undefined,
  )

  const ogImage = computed(() => {
    if (!product.value?.mainImagePath) return ''

    return img(product.value.mainImagePath, {
      ...OG_IMAGE_SIZE,
      fit: 'cover',
      format: 'png',
    }, {
      provider: 'mediaStream',
    })
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

  // Meta/TikTok/OpenAI pixels and GA4 report the view once per page
  // mount, on the client only, so the prerender pass never produces a
  // phantom event (no server-side leg for any of them).
  let viewReported = false
  function reportView() {
    if (viewReported || !product.value) return
    try {
      const productData = product.value
      const pid = productData.id != null ? String(productData.id) : ''
      const price = Number(
        productCurrentPrice(productData) ?? productData.price ?? 0,
      )
      // The same name the page shows, so what the pixels report and
      // what the shopper saw are one string.
      const reportedName = productName.value
      metaPixel.trackViewContent({
        currency: tenantStore.defaultCurrency,
        value: price,
        contentType: 'product',
        contentIds: pid ? [pid] : [],
        contents: pid ? [{ id: pid, quantity: 1, itemPrice: price }] : [],
        contentName: reportedName,
      })
      openaiPixel.trackContentsViewed({
        currency: tenantStore.defaultCurrency,
        amount: price,
        contents: pid
          ? [{ id: pid, name: reportedName, contentType: 'product', quantity: 1 }]
          : [],
      })
      tiktokPixel.trackViewContent({
        currency: tenantStore.defaultCurrency,
        value: price,
        contentType: 'product',
        contentName: reportedName,
        contents: pid
          ? [{ contentId: pid, contentName: reportedName, quantity: 1, price }]
          : [],
      })
      ga4.trackViewItem({
        currency: tenantStore.defaultCurrency,
        value: price,
        items: pid
          ? [{ item_id: pid, item_name: reportedName, price, quantity: 1 }]
          : [],
      })
      viewReported = true
    }
    catch (pixelErr) {
      log.warn(
        'product:metaPixelViewContent',
        String((pixelErr as Error)?.message ?? pixelErr),
      )
    }
  }

  onMounted(() => {
    watchEffect(() => {
      if (loggedIn.value) fetchFavourites()
    })

    reportView()

    // The recently-viewed history lives in localStorage, so it is written
    // on the client, once the translated data to show is at hand.
    if (!product.value?.id) return
    recentlyViewed.add({
      id: product.value.id,
      slug: product.value.slug ?? null,
      name: productName.value,
      mainImagePath: product.value.mainImagePath ?? null,
      finalPrice: typeof product.value.finalPrice === 'number'
        ? productCurrentPrice(product.value)
        : null,
      addedAt: Date.now(),
    })
  })

  await productRequest

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

  await Promise.all([
    imagesRequest,
    reviewsRequest,
    offersRequest,
    variantsRequest.then(variants => variants.execute()),
  ])

  // The reviews' own sheet reports a change; the list on THIS page and the
  // product's average are what must move.
  const onReviewChanged = () => Promise.all([
    refreshProduct(),
    refreshProductReviews(),
  ])

  return {
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
  }
}
