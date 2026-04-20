<script setup lang="ts">
import type { AccordionItem, TabsItem, ButtonProps } from '#ui/types'

const { t, locale, n } = useI18n()
const route = useRoute(`products-id-slug___${locale.value}`)
const { y: scrollY } = useWindowScroll()

const { isMobileOrTablet } = useDevice()

const { user, loggedIn } = useUserSession()

const toast = useToast()
const { dateLocale } = useDateLocale()
const localePath = useLocalePath()
const siteConfig = useSiteConfig()
const runtimeConfig = useRuntimeConfig()
const img = useImage()

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

const { data: product, refresh: refreshProduct } = await useFetch<ProductDetail>(
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
  throw createError({
    statusCode: 404,
    message: t('error.page.not.found'),
  })
}

// Fetch images and reviews in parallel (both needed for SSR/Schema.org)
const [
  { data: productImages },
  { data: productReviews },
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

// User-specific data: client-side only to avoid blocking SSR
useLazyFetch('/api/products/favourites/favourites-by-products', {
  key: `favouritesByProducts${user.value?.id}`,
  method: 'POST',
  body: {
    productIds: [Number(productId)],
  },
  server: false, // Client-side only - user-specific data
  immediate: shouldFetchFavouriteProducts.value,
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

// User-specific data: client-side only
const { data: userProductReview, refresh: refreshUserProductReview }
  = useLazyFetch(`/api/products/reviews/${productId}/user-product-review`, {
    key: `productReviews${productId}${user.value?.id}`,
    method: 'GET',
    immediate: loggedIn.value,
    server: false, // Client-side only - user-specific data
  })

const _onAddExistingReview = async () => {
  await refreshProduct()
  await refreshUserProductReview()
}
const _onUpdateExistingReview = async () => {
  await refreshProduct()
  await refreshUserProductReview()
}
const _onDeleteExistingReview = async () => {
  await refreshProduct()
  await refreshUserProductReview()
}

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

const _openModal = () => {
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

const canonicalUrl = computed(() => {
  const baseUrl = runtimeConfig.public.baseUrl
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
      params: { id: productId, slug: product.value?.slug },
    }),
    label: productTitle.value,
  },
])

const _reviewButtonText = computed(() => {
  if (user.value && userProductReview.value) {
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

watch(
  () => route.query,
  async () => {
    await refreshProduct()
  },
)

useSeoMeta({
  title: () => productTitle.value,
  description: () => productDescription.value,

  ogTitle: () => productTitle.value,
  ogDescription: () => productDescription.value,
  ogImage: () => ogImage.value,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: () => productTitle.value,
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  ogSiteName: siteConfig.name,
  ogLocale: () => dateLocale.value,

  twitterCard: 'summary_large_image',
  twitterTitle: () => productTitle.value,
  twitterDescription: () => productDescription.value,
  twitterImage: () => ogImage.value,
  twitterImageAlt: () => productTitle.value,
})

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
  defineProduct({
    name: () => extractTranslated(product.value, 'name', locale.value) || '',
    description: () => stripHtmlTags(extractTranslated(product.value, 'description', locale.value) || ''),
    sku: () => product.value?.uuid || '',
    productID: () => product.value?.id?.toString() || '',

    image: () => {
      const images: string[] = []
      if (productImages.value) {
        productImages.value.forEach((img) => {
          const imgPath = img.imageUrl
          if (imgPath) {
            images.push(imgPath)
          }
        })
      }
      return images.length > 0 ? images : undefined
    },

    url: () => canonicalUrl.value,

    category: () => product.value?.category?.toString() || undefined,

    brand: {
      '@type': 'Brand',
      'name': siteConfig.name,
    },

    offers: {
      '@type': 'Offer',
      'price': () => (product.value?.finalPrice || 0).toFixed(2),
      'priceCurrency': 'EUR',
      'availability': () => productAvailability.value,
      'itemCondition': () => productCondition.value,
      'url': () => canonicalUrl.value,
      'priceValidUntil': () => {
        const date = new Date()
        date.setDate(date.getDate() + 30)
        return date.toISOString().split('T')[0]
      },
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

    aggregateRating: () => {
      if (product.value?.reviewCount && product.value.reviewCount > 0) {
        return {
          '@type': 'AggregateRating',
          'ratingValue': product.value.reviewAverage || 0,
          'reviewCount': product.value.reviewCount,
          'bestRating': 10,
          'worstRating': 1,
        }
      }
      return undefined
    },

    review: () => {
      const reviews = productReviews.value?.results
      if (!reviews || reviews.length === 0) return undefined
      return reviews.slice(0, 5).map(r => ({
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
    },
  }),

  defineBreadcrumb({
    itemListElement: () => [
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
  }),
])

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper>
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
          <ProductImages :product="product" />

          <div
            class="
              flex flex-col gap-4
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
                {{ extractTranslated(product, 'name', locale) }}
              </h1>

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
                  v-if="product.discountPercent && product.discountPercent > 0"
                  color="info"
                  size="lg"
                  variant="soft"
                >
                  -{{ product.discountPercent }}%
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
                  {{ formatProductPrice(product?.finalPrice) }}
                </span>

                <span
                  v-if="product.discountValue && product.discountValue > 0"
                  class="
                    text-lg text-gray-500 line-through
                    dark:text-gray-200
                  "
                >
                  {{ formatProductPrice(product?.price) }}
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

            <!-- Loyalty Points Badge (logged in) / Guest CTA -->
            <LoyaltyPointsBadge
              v-if="loggedIn && product?.id"
              :product-id="product.id"
            />
            <ProductGuestLoyaltyCTA
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

              <ButtonProductAddToFavourite
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
                <ButtonProductAddToCart
                  :product="product"
                  :quantity="selectorQuantity || 1"
                  :text="t('add_to_cart')"
                  class="w-full"
                />
              </div>
            </div>

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
          </div>
        </div>
      </div>

      <div
        v-if="showStickyAddToCart"
        class="
          fixed right-0 bottom-12 left-0 z-40 border-t border-gray-200
          bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm
          md:bottom-0
          dark:border-gray-700 dark:bg-gray-900/95
        "
      >
        <div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <ProductImage
              v-if="productImages && productImages[0]"
              :key="product?.id"
              :image="productImages[0]"
              :width="64"
              :height="64"
              class="
                h-12 w-12 flex-shrink-0 rounded-lg object-contain
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
                  {{ formatProductPrice(product?.finalPrice) }}
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
              <span class="min-w-[2rem] text-center text-sm font-medium">
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

            <ButtonProductAddToCart
              :product="product"
              :quantity="selectorQuantity || 1"
              :text="t('add_to_cart')"
              size="xl"
            />
          </div>
        </div>
      </div>
    </section>
  </PageWrapper>
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
</i18n>
