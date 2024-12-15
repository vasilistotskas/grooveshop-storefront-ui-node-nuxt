<script lang="ts" setup>
import { useShare } from '@vueuse/core'
import { GlobalEvents } from '~/events'

const { user, loggedIn } = useUserSession()

const route = useRoute()
const { t, locale } = useI18n({ useScope: 'local' })
const toast = useToast()
const localePath = useLocalePath()
const modalBus = useEventBus<string>(GlobalEvents.GENERIC_MODAL)

const userStore = useUserStore()
const { getFavouriteByProductId, updateFavouriteProducts } = userStore

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

const { data: tags, status } = await useLazyFetch<Tag[]>(
  `/api/products/${productId}/tags`,
  {
    key: `productTags${productId}`,
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

const productTitle = computed(() => {
  return capitalize(
    product.value?.seoTitle
    || extractTranslated(product?.value, 'name', locale.value)
    || '',
  )
})
const productStock = computed(() => product.value?.stock || 0)
const selectorQuantity = ref(1)

const incrementQuantity = () => {
  if (selectorQuantity.value < productStock.value) {
    selectorQuantity.value++
  }
  else {
    toast.add({
      title: t('max_quantity_reached'),
      color: 'red',
    })
  }
}

const decrementQuantity = () => {
  if (selectorQuantity.value > 1) {
    selectorQuantity.value--
  }
}

const shareOptions = reactive({
  title: extractTranslated(product.value, 'name', locale.value),
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

const favouriteId = computed(() => {
  if (!product.value) return
  return getFavouriteByProductId(product.value?.id)?.id
})

const openModal = () => {
  if (user?.value) {
    modalBus.emit(
      `modal-open-reviewModal-${user?.value?.id}-${product?.value?.id}`,
    )
  }
  else {
    toast.add({
      title: t('must_be_logged_in'),
      color: 'red',
    })
  }
}

const reviewButtonText = computed(() => {
  if (user.value && userProductReview.value) {
    return t('update_review')
  }
  return t('write_review')
})

const links = computed(() => [
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
    to: localePath({ name: 'products-id-slug', params: { id: productId, slug: product.value?.slug } }),
    label: productTitle.value,
  },
])

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
      color: 'blue',
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
  <PageWrapper class="container">
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
          :links="links"
          :ui="{
            li: 'text-primary-950 dark:text-primary-50',
            base: 'text-xs md:text-md',
          }"
          class="mb-5"
        />
        <div
          class="
              grid gap-2

              md:grid-cols-2
            "
        >
          <div class="grid gap-4 overflow-hidden">
            <ProductImages :product="product" />
            <TagsList :status="status" :tags="tags" />
          </div>
          <div
            class="
                grid content-center items-center gap-4

                md:gap-6 md:px-4
              "
          >
            <h2
              class="
                  text-primary-950 text-2xl font-bold leading-tight
                  tracking-tight

                  dark:text-primary-50

                  md:text-3xl
                "
            >
              {{ extractTranslated(product, 'name', locale) }}
            </h2>
            <h3
              class="
                  text-primary-950 text-sm

                  dark:text-primary-50
                "
            >
              <span>{{ t('product_id') }}: </span>
              <span
                class="
                    text-indigo-700

                    dark:text-indigo-200

                    hover:underline
                  "
              >{{ product.id }}</span>
            </h3>
            <section class="actions flex items-center gap-4">
              <ClientOnly>
                <UButton
                  v-if="isSupported"
                  :disabled="!isSupported"
                  :title="$t('share')"
                  class="font-extrabold capitalize"
                  color="primary"
                  icon="i-heroicons-share"
                  size="lg"
                  square
                  variant="solid"
                  @click="startShare"
                />
                <template #fallback>
                  <ClientOnlyFallback
                    height="40px"
                    width="40px"
                  />
                </template>
              </ClientOnly>
              <ClientOnly>
                <UButton
                  :label="reviewButtonText"
                  class="
                      capitalize

                      hover:dark:text-primary-50
                    "
                  color="primary"
                  size="lg"
                  @click="openModal"
                />
                <template #fallback>
                  <ClientOnlyFallback
                    height="40px"
                    width="122px"
                  />
                </template>
              </ClientOnly>
              <LazyProductReview
                v-if="user"
                :product="product"
                :user="user"
                :user-had-reviewed="!!userProductReview"
                :user-product-review="userProductReview"
                @add-existing-review="onAddExistingReview"
                @update-existing-review="onUpdateExistingReview"
                @delete-existing-review="onDeleteExistingReview"
              />
              <LottieAddToFavourite
                :favourite-id="favouriteId"
                :product-id="product.id"
                :user-id="user?.id"
              />
            </section>
            <div class="flex items-center gap-4">
              <div class="bg-primary-50 flex rounded-lg px-3 py-2">
                <I18nN
                  :value="product.finalPrice"
                  class="text-3xl font-bold text-indigo-600"
                  format="currency"
                  tag="span"
                />
              </div>
              <div class="flex-1">
                <p class="text-xl font-semibold text-green-500">
                  {{ t('save') }}
                  {{ product.priceSavePercent }}%
                </p>
                <p
                  class="
                      text-primary-950 text-sm

                      dark:text-primary-50
                    "
                >
                  {{ t('inclusive_of_taxes') }}
                </p>
              </div>
            </div>
            <ReadMore
              :max-chars="100"
              :text="extractTranslated(product, 'description', locale) || ''"
            />
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
                    id="decrement-button"
                    :aria-label="$t('decrement')"
                    :title="$t('decrement')"
                    color="primary"
                    icon="i-heroicons-minus"
                    size="xl"
                    @click="decrementQuantity"
                  />
                  <input
                    id="counter-input"
                    v-model="selectorQuantity"
                    :aria-describedby="'increment-button decrement-button'"
                    :aria-label="t('qty')"
                    :max="productStock"
                    :min="1"
                    class="
                        bg-primary-100 border-primary-500 text-primary-900 block
                        w-full p-2.5 text-sm outline-none

                        dark:bg-primary-900 dark:border-primary-500
                        dark:text-primary-50 dark:placeholder:text-primary-400
                        dark:focus:border-blue-500 dark:focus:ring-blue-500

                        focus:border-secondary focus:ring-secondary
                      "
                    type="number"
                  >
                  <UButton
                    id="increment-button"
                    :aria-label="$t('increment')"
                    :title="$t('increment')"
                    color="primary"
                    icon="i-heroicons-plus"
                    size="xl"
                    @click="incrementQuantity"
                  />
                </div>
              </div>

              <ButtonProductAddToCart
                :product="product"
                :quantity="selectorQuantity || 1"
                :text="$t('add_to_cart')"
              />
            </div>
          </div>
        </div>
      </div>
      <ProductReviews
        :product-id="String(product.id)"
        :reviews-average="product.approvedReviewAverage"
        :reviews-count="product.approvedReviewCount"
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
  share: Μερίδιο
  max_quantity_reached: Επιτεύχθηκε η μέγιστη ποσότητα
  adjusted_to_stock: Προσαρμόστηκε στο απόθεμα {stock}
  must_be_logged_in: Πρέπει να συνδεθείς
  update_review: Ενημέρωση κριτικής
  write_review: Γράψε κριτική
</i18n>
