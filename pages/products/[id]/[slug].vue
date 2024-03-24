<script lang="ts" setup>
import { useShare } from '@vueuse/core'
import { isClient } from '@vueuse/shared'

import { GlobalEvents } from '~/events/global'
import type { Product } from '~/types/product/product'
import { capitalize } from '~/utils/str'

const { user, loggedIn } = useUserSession()

const userStore = useUserStore()
const { getUserProductFavourite } = userStore

const route = useRoute('products-id-slug___en')
const config = useRuntimeConfig()
const { t, locale } = useI18n()
const toast = useToast()
const modalBus = useEventBus<string>(GlobalEvents.GENERIC_MODAL)

const productId = route.params.id

const { data: product, refresh: refreshProduct } = await useFetch<Product>(
  `/api/products/${productId}`,
  {
    key: `product${productId}`,
    method: 'GET',
  },
)

const { data: userProductReview, refresh: refreshUserProductReview } =
  await useFetch('/api/products/reviews/user-product-review', {
    key: `productReviews${productId}${user.value?.id}`,
    method: 'POST',
    body: {
      product: String(productId),
      user: String(user.value?.id),
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
    product.value?.seoTitle ||
      extractTranslated(product?.value, 'name', locale.value) ||
      '',
  )
})
const productStock = computed(() => product.value?.stock || 0)
const selectorQuantity = ref(1)

const incrementQuantity = () => {
  if (selectorQuantity.value < productStock.value) {
    selectorQuantity.value++
  } else {
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
const startShare = () => share().catch((err) => err)
const userProductFavourite = computed(() => {
  return getUserProductFavourite(Number(productId))
})

const openModal = () => {
  if (user?.value) {
    modalBus.emit(
      `modal-open-reviewModal-${user?.value?.id}-${product?.value?.id}`,
    )
  } else {
    toast.add({
      title: t('components.product.review.must_be_logged_in'),
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
  () => refreshProduct(),
  { deep: true },
)

watch(selectorQuantity, (newValue) => {
  const maxQuantity = productStock.value
  if (newValue > maxQuantity) {
    selectorQuantity.value = maxQuantity
    toast.add({
      title: t('pages.product.adjusted_to_stock', {
        stock: maxQuantity,
      }),
    })
  } else if (newValue < 1) {
    selectorQuantity.value = 1
  }
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
  keepalive: false,
})
</script>

<template>
  <PageWrapper class="container">
    <PageBody>
      <div v-if="product" class="product mb-12 md:mb-24">
        <div class="mx-auto max-w-7xl pb-6 sm:px-6 md:px-4 lg:px-8">
          <UBreadcrumb :links="links" class="mb-5" />
          <div class="grid gap-2 md:grid-cols-2">
            <div class="overflow-hidden">
              <ProductImages :product="product" />
            </div>
            <div
              class="grid content-center items-center gap-4 md:gap-6 md:px-4"
            >
              <h2
                class="text-primary-700 dark:text-primary-100 text-2xl font-bold leading-tight tracking-tight md:text-3xl"
              >
                {{ extractTranslated(product, 'name', locale) }}
              </h2>
              <h3 class="text-primary-700 dark:text-primary-100 text-sm">
                <span>{{ $t('pages.product.product_id') }}: </span>
                <span
                  class="text-indigo-700 hover:underline dark:text-indigo-200"
                  >{{ product.id }}</span
                >
              </h3>
              <PageSection class="actions flex items-center gap-4">
                <ClientOnly>
                  <UButton
                    v-if="isSupported"
                    :disabled="!isSupported"
                    icon="i-heroicons-share"
                    size="lg"
                    color="white"
                    square
                    variant="solid"
                    class="font-extrabold capitalize"
                    @click="startShare"
                  />
                  <template #fallback>
                    <ClientOnlyFallback height="40px" width="40px" />
                  </template>
                </ClientOnly>
                <ClientOnly>
                  <UButton
                    class="capitalize hover:text-slate-900 hover:no-underline hover:dark:text-white"
                    :label="reviewButtonText"
                    size="lg"
                    color="white"
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
                  :is-favourite="userProductFavourite !== null"
                  :favourite="userProductFavourite"
                  :is-authenticated="loggedIn"
                />
              </PageSection>
              <div class="flex items-center gap-4">
                <div>
                  <div class="flex rounded-lg bg-zinc-100 px-3 py-2">
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
                  <p class="text-primary-700 dark:text-primary-100 text-sm">
                    {{ $t('pages.product.inclusive_of_taxes') }}
                  </p>
                </div>
              </div>
              <ReadMore
                :text="extractTranslated(product, 'description', locale) || ''"
                :max-chars="100"
              />
              <div class="flex flex-col gap-4 md:flex-row md:gap-0">
                <div class="grid">
                  <label for="counter-input" class="sr-only">{{
                    $t('pages.product.qty')
                  }}</label>
                  <div
                    class="relative flex items-center rounded-lg bg-white dark:bg-zinc-800"
                  >
                    <UButton
                      id="decrement-button"
                      icon="i-heroicons-minus"
                      size="xl"
                      color="white"
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
                      class="block w-full border-gray-300 bg-white p-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-zinc-800 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                    >
                    <UButton
                      id="increment-button"
                      icon="i-heroicons-plus"
                      size="xl"
                      color="white"
                      :title="$t('common.increment')"
                      :aria-label="$t('common.increment')"
                      @click="incrementQuantity"
                    />
                  </div>
                </div>

                <ButtonAddToCart
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
