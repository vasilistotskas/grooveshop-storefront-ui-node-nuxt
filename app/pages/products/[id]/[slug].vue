<script setup lang="ts">
import type { AccordionItem } from '@nuxt/ui'
import { GlobalEvents } from '~/events'

interface ProductAttributes {
  processor?: string
  memory?: string
  storage?: string
  graphics?: string
  display?: string
  battery?: string
  weight?: string
  dimensions?: string
  highlights?: string
  features?: string
}

const route = useRoute()
const { $i18n } = useNuxtApp()
const { t, locale } = useI18n({ useScope: 'local' })
const { y: scrollY } = useWindowScroll()

const { user, loggedIn } = useUserSession()

const toast = useToast()
const localePath = useLocalePath()
const modalBus = useEventBus<string>(GlobalEvents.GENERIC_MODAL)

const userStore = useUserStore()
const { getFavouriteByProductId, updateFavouriteProducts } = userStore

const selectorQuantity = ref(1)
const productAttributes = ref<ProductAttributes>({
  processor: 'Intel Core i7-12700H',
  memory: '16GB DDR5',
  storage: '512GB NVMe SSD',
  graphics: 'NVIDIA RTX 3060 6GB',
  display: '15.6" FHD IPS 144Hz',
  battery: '70Wh Li-ion',
  weight: '2.1kg',
  dimensions: '359 x 266 x 23.9mm',
  highlights: 'High-performance gaming laptop with the latest Intel CPU and NVIDIA graphics',
  features: 'RGB keyboard, Thunderbolt 4, Wi-Fi 6, Bluetooth 5.2',
})
const accordionItems = ref<AccordionItem[]>([
  {
    id: 'highlights',
    label: t('key_highlights'),
    icon: 'i-heroicons-star',
    content: productAttributes.value?.highlights || t('no_highlights_available'),
    open: true,
  },
  {
    id: 'features',
    label: t('key_features'),
    icon: 'i-heroicons-check-badge',
    content: productAttributes.value?.features || t('no_features_available'),
    open: false,
  },
  {
    id: 'shipping',
    label: t('shipping_returns'),
    icon: 'i-heroicons-truck',
    content: t('standard_shipping_info'),
    open: false,
  },
  {
    id: 'warranty',
    label: t('warranty_support'),
    icon: 'i-heroicons-shield-check',
    content: t('standard_warranty_info'),
    open: false,
  },
])
const technicalSpecifications = ref([
  { property: 'Weight', value: '1.2 kg' },
  { property: 'Dimensions', value: '10 x 5 x 2 cm' },
])

const productId = 'id' in route.params
  ? route.params.id
  : undefined

const { data: product, refresh: refreshProduct } = await useFetch<Product>(
  `/api/products/${productId}`,
  {
    key: `product${productId}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      language: locale,
    },
  },
)

const { data: productImages } = await useFetch<ProductImage[]>(
  `/api/products/${product.value?.id}/images`,
  {
    key: `productImages${product.value?.id}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      language: locale,
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

const shouldFetchFavouriteProducts = computed(() => {
  return loggedIn.value
})

if (shouldFetchFavouriteProducts.value) {
  await useLazyFetch<ProductFavourite[]>('/api/products/favourites/favourites-by-products', {
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
      updateFavouriteProducts(favourites)
    },
  })
}

const { data: userProductReview, refresh: refreshUserProductReview }
  = await useFetch<ProductReview>('/api/products/reviews/user-product-review', {
    key: `productReviews${productId}${user.value?.id}`,
    headers: useRequestHeaders(),
    method: 'POST',
    body: {
      product: String(productId),
    },
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
    modalBus.emit(
      `modal-open-reviewModal-${user?.value?.id}-${product?.value?.id}`,
    )
  }
  else {
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
  return getFavouriteByProductId(product.value?.id)?.id
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
    to: localePath({ name: 'products-id-slug', params: { id: productId, slug: product.value?.slug } }),
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
  url: import.meta.client ? `/products/${product.value?.id}/${product.value?.slug}` : '',
})
const { share, isSupported } = useShare(shareOptions)
const startShare = async () => {
  try {
    await share()
  }
  catch (err) {
    console.error('Share failed:', err)
  }
}

watch(
  () => route.query,
  async () => {
    await refreshProduct()
  },
)

watch(selectorQuantity, (newValue) => {
  const maxQuantity = productStock.value
  if (newValue > maxQuantity) {
    selectorQuantity.value = maxQuantity
    toast.add({
      title: t('adjusted_to_stock', {
        stock: maxQuantity,
      }),
      color: 'info',
    })
  }
  else if (newValue < 1) {
    selectorQuantity.value = 1
  }
})

onMounted(() => {
  $fetch<Product>(`/api/products/${productId}/update-view-count`, {
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

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper>
    <div
      v-if="product"
      class="
          product mb-12

          md:mb-24
        "
    >
      <div
        class="
            mx-auto max-w-7xl pb-6

            lg:px-8

            md:px-4

            sm:px-6
          "
      >
        <UBreadcrumb
          :items="items"
          :ui="{
            item: 'text-primary-950 dark:text-primary-50',
            root: 'text-xs md:text-md',
          }"
          class="mb-5"
        />
        <div
          class="
              grid gap-2

              md:grid-cols-2
            "
        >
          <ProductImages :product="product" />
          <div
            class="
                grid content-center items-center gap-4

                md:gap-6 md:px-4
              "
          >
            <h2 class="text-primary-950 dark:text-primary-50 text-2xl md:text-3xl font-bold leading-tight tracking-tight group">
              <span class="relative inline-block">
                {{ extractTranslated(product, 'name', locale) }}
                <span class="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 transition-all duration-300 group-hover:w-full" />
              </span>
            </h2>

            <section class="actions flex flex-wrap items-center gap-3 mt-2">
              <ClientOnly>
                <UButton
                  v-if="isSupported"
                  :disabled="!isSupported"
                  :title="t('share')"
                  class="font-semibold capitalize transition-all duration-300 hover:scale-105 group"
                  color="neutral"
                  variant="ghost"
                  size="md"
                  @click="startShare"
                >
                  <template #leading>
                    <UIcon name="i-heroicons-share" class="mr-1 group-hover:animate-pulse" />
                  </template>
                  {{ t('share') }}
                </UButton>
                <template #fallback>
                  <USkeleton
                    class="h-8 w-[130px]"
                  />
                </template>
              </ClientOnly>

              <UButton
                :label="reviewButtonText"
                class="font-semibold capitalize transition-all duration-300 hover:scale-105 group"
                color="neutral"
                variant="ghost"
                size="md"
                @click="openModal"
              >
                <template #leading>
                  <UIcon name="i-heroicons-chat-bubble-left-right" class="mr-1 group-hover:animate-pulse" />
                </template>
              </UButton>

              <ButtonProductAddToFavourite
                :favourite-id="favouriteId"
                :product-id="product?.id"
                :user-id="user?.id"
                class="z-10"
              />

              <LazyProductReview
                v-if="user"
                :product="product"
                :user="user"
                :user-had-reviewed="!!userProductReview"
                :user-product-review="userProductReview"
                class="transition-transform duration-300 hover:scale-105"
                @add-existing-review="onAddExistingReview"
                @update-existing-review="onUpdateExistingReview"
                @delete-existing-review="onDeleteExistingReview"
              />
            </section>
            <div class="mt-3 mb-4 space-y-4">
              <div class="flex flex-wrap items-end gap-3">
                <div class="relative">
                  <span class="text-4xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 dark:from-primary-400 dark:to-indigo-400 bg-clip-text text-transparent transition-all duration-300 hover:scale-105">
                    {{ formatProductPrice(product?.finalPrice) }}
                  </span>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                <span class="inline-flex items-center bg-primary-50 dark:bg-primary-900 px-3 py-1 rounded-full transition-transform hover:scale-105 duration-300">
                  <UIcon name="i-heroicons-truck" class="mr-1" />
                  {{ useI18n().t('free_shipping') || 'Δωρεάν Αποστολή' }}
                </span>
                <span class="inline-flex items-center bg-primary-50 dark:bg-primary-900 px-3 py-1 rounded-full transition-transform hover:scale-105 duration-300">
                  <UIcon name="i-heroicons-shield-check" class="mr-1" />
                  {{ useI18n().t('inclusive_of_taxes') || 'Περιλαμβάνονται όλοι οι φόροι.' }}
                </span>
              </div>
            </div>
            <div
              class="
                  flex flex-col gap-4

                  md:flex-row md:gap-0
                "
            >
              <div class="grid">
                <label
                  class="sr-only"
                  for="counter-input"
                >{{
                  t('qty')
                }}</label>
                <div
                  class="
                      bg-primary-100 relative flex items-center rounded-lg

                      dark:bg-primary-900
                    "
                >
                  <UButton
                    icon="i-heroicons-minus"
                    color="primary"
                    variant="ghost"
                    size="sm"
                    aria-label="Decrease quantity"
                    @click="decrementQuantity"
                  />
                  <span class="w-8 text-center">{{ selectorQuantity }}</span>
                  <UButton
                    icon="i-heroicons-plus"
                    color="primary"
                    variant="ghost"
                    size="sm"
                    aria-label="Increase quantity"
                    @click="incrementQuantity"
                  />
                </div>
              </div>

              <ButtonProductAddToCart
                :product="product"
                :quantity="selectorQuantity || 1"
                :text="$i18n.t('add_to_cart')"
              />
            </div>

            <UCard
              class="border border-gray-200 dark:border-gray-700 p-4"
              :ui="{
                root: 'overflow-hidden',
                body: 'grow p-0',
              }"
            >
              <template #header>
                <div class="flex justify-between items-center">
                  <h3 class="text-lg font-semibold">
                    {{ t('product_details') }}
                  </h3>
                </div>
              </template>

              <div class="prose dark:prose-invert max-w-none pt-4">
                <div v-if="extractTranslated(product, 'description', locale)" class="product-description">
                  <div v-html="extractTranslated(product, 'description', locale) || ''" />
                </div>
                <p v-else class="text-gray-500 dark:text-gray-400">
                  {{ t('no_description_available') }}
                </p>
              </div>
            </UCard>

            <UTable :data="technicalSpecifications" />

            <UAccordion
              :items="accordionItems"
            >
              <template #default="{ item }">
                <div class="py-4">
                  <div class="prose dark:prose-invert max-w-none">
                    {{ item.content }}
                  </div>
                </div>
              </template>
            </UAccordion>
          </div>
        </div>
      </div>
      <div
        v-if="showStickyAddToCart"
        class="fixed bottom-0 left-0 right-0 z-40 bg-primary-50 dark:bg-primary-800 shadow-md border-t border-gray-200 dark:border-gray-700 py-3 px-4"
      >
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <ProductImage
              v-if="productImages"
              :key="product?.id"
              :image="productImages[0]"
              class="h-12 w-12 object-contain rounded-md"
            />
            <div>
              <h3 class="text-sm font-medium truncate max-w-[200px] md:max-w-md">
                {{ productTitle }}
              </h3>
              <div class="flex items-center space-x-2">
                <span class="text-lg font-bold text-secondary-600 dark:text-secondary-400">
                  {{ new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(product?.finalPrice || 0) }}
                </span>
              </div>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <div class="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg">
              <UButton
                icon="i-heroicons-minus"
                color="primary"
                variant="ghost"
                size="sm"
                aria-label="Decrease quantity"
                @click="decrementQuantity"
              />
              <span class="w-8 text-center">{{ selectorQuantity }}</span>
              <UButton
                icon="i-heroicons-plus"
                color="primary"
                variant="ghost"
                size="sm"
                aria-label="Increase quantity"
                @click="incrementQuantity"
              />
            </div>
            <ButtonProductAddToCart
              :product="product"
              :quantity="selectorQuantity || 1"
              :text="$i18n.t('add_to_cart')"
            />
          </div>
        </div>
      </div>

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
  save: Αποθήκευση
  inclusive_of_taxes: Συμπεριλαμβάνονται όλοι οι φόροι.
  qty: Ποσ
  share: Μοιράσου το
  max_quantity_reached: Επιτεύχθηκε η μέγιστη ποσότητα
  adjusted_to_stock: Προσαρμόστηκε στο απόθεμα {stock}
  must_be_logged_in: Πρέπει να συνδεθείς
  update_review: Ενημέρωση κριτικής
  write_review: Γράψε κριτική
  processor: Επεξεργαστής
  memory: Μνήμη
  storage: Αποθηκευτικός χώρος
  graphics: Γραφικά
  display: Οθόνη
  battery: Μπαταρία
  weight: Βάρος
  dimensions: Διαστάσεις
  key_highlights: Βασικά σημεία
  key_features: Βασικά χαρακτηριστικά
  shipping_returns: Αποστολή & Επιστροφές
  warranty_support: Εγγύηση & Υποστήριξη
  no_highlights_available: Δεν υπάρχουν διαθέσιμα κύρια σημεία
  no_features_available: Δεν υπάρχουν διαθέσιμα χαρακτηριστικά
  standard_shipping_info: Τυπικές πληροφορίες αποστολής
  standard_warranty_info: Τυπική εγγύηση κατασκευαστή 1 έτους
  product_details: Λεπτομέρειες προϊόντος
  no_description_available: Δεν υπάρχει διαθέσιμη περιγραφή
  related_products: Σχετικά προϊόντα
  click_to_zoom: Κάντε κλικ για μεγέθυνση
  view_image: Προβολή εικόνας
  product: Προϊόν
  increment: Αύξηση
  decrement: Μείωση
  add_to_cart: Προσθήκη στο καλάθι
  free_shipping: Δωρεάν Μεταφορικά
</i18n>
