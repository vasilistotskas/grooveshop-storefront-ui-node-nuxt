<script lang="ts" setup>
import { useShare } from '@vueuse/core'
import { isClient } from '@vueuse/shared'

import { GlobalEvents } from '~/events'
import { capitalize } from '~/utils/str'

const { user, loggedIn } = useUserSession()

const route = useRoute()
const config = useRuntimeConfig()
const { t, locale } = useI18n()
const toast = useToast()
const modalBus = useEventBus<string>(GlobalEvents.GENERIC_MODAL)

const userStore = useUserStore()
const { getFavouriteByProductId, updateFavouriteProducts } = userStore

const productId = Number(route.params.id)

const { data: product, refresh: refreshProduct } = await useFetch(
  `/api/products/${productId}`,
  {
    key: `product${productId}`,
    method: 'GET',
    query: {
      language: locale.value,
    },
  },
)

if (!product.value) {
  throw createError({
    statusCode: 404,
    message: t('common.error.page.not.found'),
    fatal: true,
  })
}

const shouldFetchFavouriteProducts = computed(() => {
  return loggedIn.value
})

await useFetch('/api/products/favourites/favourites-by-products', {
  method: 'POST',
  body: {
    productIds: [productId],
  },
  immediate: shouldFetchFavouriteProducts.value,
  onResponse({ response }) {
    if (!response.ok) {
      return
    }
    const favourites = response._data
    updateFavouriteProducts(favourites)
  },
})

const { data: userProductReview, refresh: refreshUserProductReview }
  = await useFetch('/api/products/reviews/user-product-review', {
    key: `productReviews${productId}${user.value?.id}`,
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
      title: t('pages.product.max_quantity_reached'),
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
  url: isClient ? `/products/${product.value?.id}/${product.value?.slug}` : '',
})
const { share, isSupported } = useShare(shareOptions)
const startShare = () => share().catch(err => err)

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
      title: t('components.product.review.must_be_logged_in'),
      color: 'red',
    })
  }
}

const reviewButtonText = computed(() => {
  if (user.value && userProductReview.value) {
    return t('components.product.review.update_review')
  }
  return t('components.product.review.write_review')
})

const links = [
  {
    to: locale.value === config.public.defaultLocale ? '/' : `/${locale.value}`,
    label: t('breadcrumb.items.index.label'),
    icon: 'i-heroicons-home',
  },
  {
    to:
      locale.value === config.public.defaultLocale
        ? '/products'
        : `/${locale.value}/products`,
    label: t('breadcrumb.items.products.label'),
  },
  {
    to:
      locale.value === config.public.defaultLocale
        ? `/products/${productId}/${product.value?.slug}`
        : `/${locale.value}/products/${productId}/${product.value?.slug}`,
    label: productTitle.value,
  },
]

watch(
  () => route.query,
  async (newVal, oldVal) => {
    if (!deepEqual(newVal, oldVal)) {
      await refreshProduct()
    }
  },
)

watch(selectorQuantity, (newValue) => {
  const maxQuantity = productStock.value
  if (newValue > maxQuantity) {
    selectorQuantity.value = maxQuantity
    toast.add({
      title: t('pages.product.adjusted_to_stock', {
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
  $fetch(`/api/products/${productId}/update-view-count`, {
    method: 'POST',
  })
})

useSchemaOrg([
  defineProduct({
    name: () => extractTranslated(product.value, 'name', locale.value) || '',
    description: () =>
      extractTranslated(product.value, 'description', locale.value) || '',
    image: () => [product.value?.mainImageAbsoluteUrl || ''],
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
    <PageBody>
      <div
        v-if="product" class="
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
            class="mb-5"
            :ui="{
              li: 'text-primary-950 dark:text-primary-50',
              base: 'text-xs md:text-md',
            }"
          />
          <div
            class="
              grid gap-2

              md:grid-cols-2
            "
          >
            <div class="overflow-hidden">
              <ProductImages :product="product" />
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
                <span>{{ $t('pages.product.product_id') }}: </span>
                <span
                  class="
                    text-indigo-700

                    dark:text-indigo-200

                    hover:underline
                  "
                >{{ product.id }}</span>
              </h3>
              <PageSection class="actions flex items-center gap-4">
                <ClientOnly>
                  <UButton
                    v-if="isSupported"
                    :disabled="!isSupported"
                    icon="i-heroicons-share"
                    size="lg"
                    color="primary"
                    square
                    variant="solid"
                    class="font-extrabold capitalize"
                    :title="$t('common.share')"
                    @click="startShare"
                  />
                  <template #fallback>
                    <ClientOnlyFallback height="40px" width="40px" />
                  </template>
                </ClientOnly>
                <ClientOnly>
                  <UButton
                    class="
                      capitalize

                      hover:text-slate-900 hover:no-underline
                      hover:dark:text-primary-50
                    "
                    :label="reviewButtonText"
                    size="lg"
                    color="primary"
                    @click="openModal"
                  />
                  <template #fallback>
                    <ClientOnlyFallback width="122px" height="40px" />
                  </template>
                </ClientOnly>
                <ProductReview
                  v-if="user"
                  :user-product-review="userProductReview"
                  :user-had-reviewed="!!userProductReview"
                  :product="product"
                  :user="user"
                  @add-existing-review="onAddExistingReview"
                  @update-existing-review="onUpdateExistingReview"
                  @delete-existing-review="onDeleteExistingReview"
                />
                <LottieAddToFavourite
                  :product-id="product.id"
                  :user-id="user?.id"
                  :favourite-id="favouriteId"
                />
              </PageSection>
              <div class="flex items-center gap-4">
                <div>
                  <div class="bg-primary-50 flex rounded-lg px-3 py-2">
                    <I18nN
                      tag="span"
                      class="text-3xl font-bold text-indigo-600"
                      format="currency"
                      :value="product.finalPrice"
                    />
                  </div>
                </div>
                <div class="flex-1">
                  <p class="text-xl font-semibold text-green-500">
                    {{ $t('pages.product.save') }}
                    {{ product.priceSavePercent }}%
                  </p>
                  <p
                    class="
                      text-primary-950 text-sm

                      dark:text-primary-50
                    "
                  >
                    {{ $t('pages.product.inclusive_of_taxes') }}
                  </p>
                </div>
              </div>
              <ReadMore
                :text="extractTranslated(product, 'description', locale) || ''"
                :max-chars="100"
              />
              <div
                class="
                  flex flex-col gap-4

                  md:flex-row md:gap-0
                "
              >
                <div class="grid">
                  <label for="counter-input" class="sr-only">{{
                    $t('pages.product.qty')
                  }}</label>
                  <div
                    class="
                      bg-primary-100 relative flex items-center rounded-lg

                      dark:bg-primary-900
                    "
                  >
                    <UButton
                      id="decrement-button"
                      icon="i-heroicons-minus"
                      size="xl"
                      color="primary"
                      :title="$t('common.decrement')"
                      :aria-label="$t('common.decrement')"
                      @click="decrementQuantity"
                    />
                    <input
                      id="counter-input"
                      v-model="selectorQuantity"
                      type="number"
                      :min="1"
                      :max="productStock"
                      :aria-label="$t('pages.product.qty')"
                      :aria-describedby="'increment-button decrement-button'"
                      class="
                        bg-primary-100 block w-full border-primary-500 p-2.5
                        text-sm text-primary-900 outline-none

                        dark:bg-primary-900 dark:border-primary-500
                        dark:text-primary-50 dark:placeholder-primary-400
                        dark:focus:border-blue-500 dark:focus:ring-blue-500

                        focus:border-secondary focus:ring-secondary
                      "
                    >
                    <UButton
                      id="increment-button"
                      icon="i-heroicons-plus"
                      size="xl"
                      color="primary"
                      :title="$t('common.increment')"
                      :aria-label="$t('common.increment')"
                      @click="incrementQuantity"
                    />
                  </div>
                </div>

                <ButtonProductAddToCart
                  :product="product"
                  :quantity="selectorQuantity || 1"
                  :text="$t('pages.product.add_to_cart')"
                />
              </div>
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
    </PageBody>
  </PageWrapper>
</template>
