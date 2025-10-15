<script setup lang="ts">
import type { TabsItem, ButtonProps } from '@nuxt/ui'

const route = useRoute()
const { $i18n } = useNuxtApp()
const { t, locale } = useI18n()
const { y: scrollY } = useWindowScroll()

const { user, loggedIn } = useUserSession()

const toast = useToast()
const localePath = useLocalePath()

const userStore = useUserStore()
const { getFavouriteIdByProductId, updateFavouriteProducts } = userStore

const isReviewModalOpen = ref(false)
const isLoginModalOpen = ref(false)
const selectorQuantity = ref(1)

const productId = 'id' in route.params ? route.params.id : undefined

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
    fatal: true,
  })
}

const { data: productImages } = await useFetch(
  `/api/products/${product.value?.id}/images`,
  {
    key: `productImages${product.value?.id}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      languageCode: locale,
    },
  },
)

const shouldFetchFavouriteProducts = computed(() => {
  return loggedIn.value
})

if (shouldFetchFavouriteProducts.value) {
  await useLazyFetch('/api/products/favourites/favourites-by-products', {
    key: `favouritesByProducts${user.value?.id}`,
    method: 'POST',
    headers: useRequestHeaders(),
    body: {
      productIds: [Number(productId)],
    },
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
}

const { data: userProductReview, refresh: refreshUserProductReview }
  = await useFetch(`/api/products/reviews/${productId}/user-product-review`, {
    key: `productReviews${productId}${user.value?.id}`,
    headers: useRequestHeaders(),
    method: 'GET',
    immediate: loggedIn.value,
  })

const onAddExistingReview = async () => {
  await refreshProduct()
  await refreshUserProductReview()
}
const onUpdateExistingReview = async () => {
  await refreshProduct()
  await refreshUserProductReview()
}
const onDeleteExistingReview = async () => {
  await refreshProduct()
  await refreshUserProductReview()
}

const formatProductPrice = (price?: number) => {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price || 0)
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

const productStock = computed(() => product.value?.stock || 0)
const showStickyAddToCart = computed(() => scrollY.value > 350)

const favouriteId = computed(() => {
  if (!product.value) return
  const favourite = getFavouriteIdByProductId(product.value?.id)
  return favourite
})

const items = computed(() => [
  {
    to: localePath('index'),
    label: $i18n.t('breadcrumb.items.index.label'),
    icon: $i18n.t('breadcrumb.items.index.icon'),
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

const reviewButtonText = computed(() => {
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
    console.error('Share failed:', error)
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

const productSpecifications = computed(() => {
  const specs = []

  if (product.value?.weight) {
    specs.push({
      label: t('weight'),
      value: `${product.value.weight.value} ${product.value.weight.unit || 'kg'}`,
      icon: 'i-heroicons-scale',
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

onMounted(() => {
  $fetch(`/api/products/${productId}/update-view-count`, {
    method: 'POST',
  })
})

useSchemaOrg([
  defineProduct({
    name: () => extractTranslated(product.value, 'name', locale.value) || '',
    description: () =>
      extractTranslated(product.value, 'description', locale.value) || '',
    sku: () => product.value?.uuid || '',
    offer: {
      price: () => (product.value?.price || 0).toFixed(2),
    },
  }),
])

defineRouteRules({
  robots: false,
})

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper>
    <div
      v-if="product" id="product" class="
        mb-12
        md:mb-24
      "
    >
      <div
        class="
          mx-auto max-w-7xl pb-6
          sm:px-6
          lg:px-8
        "
      >
        <UBreadcrumb
          :items="items"
          :ui="{
            item: 'text-primary-950 dark:text-primary-50',
            root: 'text-xs md:text-base',
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
                    dark:text-gray-400
                  "
                >
                  {{ formatProductPrice(product?.price) }}
                </span>
              </div>
            </div>

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
                  <USkeleton class="h-9 w-full max-w-32" />
                </template>
              </ClientOnly>

              <UButton
                :label="reviewButtonText"
                color="neutral"
                variant="ghost"
                size="lg"
                icon="i-heroicons-chat-bubble-left-right"
                @click="openModal"
              />

              <ButtonProductAddToFavourite
                :favourite-id="favouriteId"
                :product-id="product?.id"
                :user-id="user?.id"
              />

              <LazyProductReview
                v-if="user && isReviewModalOpen"
                v-model="isReviewModalOpen"
                :product="product"
                :user="user"
                :user-had-reviewed="!!userProductReview"
                :user-product-review="userProductReview"
                @add-existing-review="onAddExistingReview"
                @update-existing-review="onUpdateExistingReview"
                @delete-existing-review="onDeleteExistingReview"
              />
              <template v-else>
                <LazyAccountLoginFormModal
                  v-if="isLoginModalOpen"
                  v-model="isLoginModalOpen"
                />
              </template>
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
                />
              </div>

              <div class="flex h-full">
                <label class="sr-only mb-2 block text-sm font-medium opacity-0">
                  {{ t('add_to_cart') }}
                </label>
                <ButtonProductAddToCart
                  :product="product"
                  :quantity="selectorQuantity || 1"
                  :text="$i18n.t('add_to_cart')"
                  :disabled="productStock === 0"
                  class="w-full"
                />
              </div>
            </div>

            <USeparator class="my-2" />

            <UTabs :items="productTabs" class="w-full" color="neutral">
              <template #description>
                <div
                  class="max-w-none py-4"
                >
                  <div
                    v-if="extractTranslated(product, 'description', locale)"
                    v-html="extractTranslated(product, 'description', locale) || ''"
                  />
                  <p
                    v-else
                    class="
                      text-gray-500
                      dark:text-gray-400
                    "
                  >
                    {{ t('no_description_available') }}
                  </p>
                </div>
              </template>

              <template #specifications>
                <div class="py-4">
                  <div v-if="productSpecifications.length > 0" class="space-y-3">
                    <div
                      v-for="spec in productSpecifications"
                      :key="spec.label"
                      class="
                        flex items-center justify-between rounded-lg border
                        border-gray-200 p-4
                        dark:border-gray-700
                      "
                    >
                      <div class="flex items-center gap-3">
                        <UIcon :name="spec.icon" class="h-5 w-5 text-gray-400" />
                        <span class="font-medium">{{ spec.label }}</span>
                      </div>
                      <span
                        class="
                          text-gray-600
                          dark:text-gray-400
                        "
                      >
                        {{ spec.value }}
                      </span>
                    </div>
                  </div>
                  <p
                    v-else
                    class="
                      text-gray-500
                      dark:text-gray-400
                    "
                  >
                    {{ t('no_specifications_available') }}
                  </p>
                </div>
              </template>
            </UTabs>
          </div>
        </div>
      </div>

      <div
        v-if="showStickyAddToCart"
        class="
          fixed right-0 bottom-0 left-0 z-40 border-t border-gray-200
          bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm
          dark:border-gray-700 dark:bg-gray-900/95
        "
      >
        <div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <ProductImage
              v-if="productImages && productImages[0]"
              :key="product?.id"
              :image="productImages[0]"
              class="h-12 w-12 flex-shrink-0 rounded-lg object-contain"
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
              :text="$i18n.t('add_to_cart')"
              :disabled="productStock === 0"
              size="lg"
            />
          </div>
        </div>
      </div>

      <USeparator class="my-8" />
      <ProductReviews
        :product-id="String(product.id)"
        :reviews-average="product.reviewAverage"
        :reviews-count="product.reviewCount"
        display-image-of="user"
      />
    </div>
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
  add_to_cart: Προσθήκη στο καλάθι
  out_of_stock: Μη διαθέσιμο
  low_stock: Χαμηλό απόθεμα ({count})
  in_stock: Διαθέσιμο
</i18n>
