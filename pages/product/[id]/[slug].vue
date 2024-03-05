<script lang="ts" setup>
import { useShare } from '@vueuse/core'
import { isClient } from '@vueuse/shared'

import { GlobalEvents } from '~/events/global'
import type { Product } from '~/types/product/product'
import type { ProductReview } from '~/types/product/review'
import { capitalize } from '~/utils/str'

const { user, loggedIn } = useUserSession()

const userStore = useUserStore()
const { getIsProductInFavourites, getUserToProductFavourite } = userStore

const route = useRoute('product-id-slug___en')
const config = useRuntimeConfig()
const { t, locale } = useI18n()
const toast = useToast()
const { extractTranslated } = useTranslationExtractor()
const modalBus = useEventBus<string>(GlobalEvents.GENERIC_MODAL)

const productId = route.params.id

const { data: product, refresh: refreshProduct } = await useFetch<Product>(
	`/api/products/${productId}`,
	{
		key: `product${productId}`,
		method: 'GET'
	}
)

const { data: userProductReview, refresh: refreshUserProductReview } =
	await useFetch<ProductReview>(`/api/products/reviews/user-product-review`, {
		key: `productReviews${productId}${user.value?.id}`,
		method: 'POST',
		body: {
			product: String(productId),
			user: String(user.value?.id)
		}
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
			extractTranslated(product.value, 'name', locale.value) ||
			''
	)
})
const selectorQuantity = ref(1)

const shareOptions = reactive({
	title: extractTranslated(product.value, 'name', locale.value),
	text: extractTranslated(product.value, 'description', locale.value) || '',
	url: isClient ? `/product/${product.value?.id}/${product.value?.slug}` : ''
})
const { share, isSupported } = useShare(shareOptions)
const startShare = () => share().catch((err) => err)
const productInUserFavourites = computed(() => {
	return getIsProductInFavourites(Number(productId))
})

const userToProductFavourite = computed(() => {
	return getUserToProductFavourite(Number(productId))
})

const openModal = () => {
	if (user?.value) {
		modalBus.emit(`modal-open-reviewModal-${user?.value?.id}-${product?.value?.id}`)
	} else {
		toast.add({
			title: t('components.product.review.must_be_logged_in')
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
		icon: 'i-heroicons-home'
	},
	{
		to:
			locale.value === config.public.defaultLocale
				? '/products'
				: `/${locale.value}/products`,
		label: t('breadcrumb.items.products.label')
	},
	{
		to:
			locale.value === config.public.defaultLocale
				? `/product/${productId}/${product.value?.slug}`
				: `/${locale.value}/product/${productId}/${product.value?.slug}`,
		label: productTitle.value
	}
]

watch(
	() => route.query,
	() => refreshProduct(),
	{ deep: true }
)

useSchemaOrg([
	defineProduct({
		name: () => extractTranslated(product.value, 'name', locale.value) || '',
		description: () =>
			extractTranslated(product.value, 'description', locale.value) || '',
		image: () => [product.value?.mainImageAbsoluteUrl || ''],
		sku: () => product.value?.uuid || '',
		offer: {
			price: () => (product.value?.price || 0).toFixed(2)
		}
	})
])

definePageMeta({
	layout: 'default',
	keepalive: false
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
            <div class="grid content-center items-center gap-6 px-4">
              <h2
                class="text-primary-700 dark:text-primary-100 text-2xl font-bold leading-tight tracking-tight md:text-3xl"
              >
                {{ extractTranslated(product, 'name', locale) }}
              </h2>
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
                  :is-favourite="productInUserFavourites"
                  :favourite="userToProductFavourite"
                  :is-authenticated="loggedIn"
                />
              </PageSection>
              <h3 class="text-primary-700 dark:text-primary-100 text-sm">
                <span>{{ $t('pages.product.product_id') }}: </span>
                <span class="text-indigo-700 hover:underline dark:text-indigo-200">{{
                  product.id
                }}</span>
              </h3>

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
                <div class="relative">
                  <div
                    class="text-primary-700 dark:text-primary-100 absolute left-0 right-0 block hidden pt-2 text-center text-xs font-semibold uppercase tracking-wide md:grid"
                  >
                    <label for="quantity">{{ $t('pages.product.qty') }}</label>
                  </div>
                  <select
                    id="quantity"
                    v-model="selectorQuantity"
                    class="text-primary-700 dark:text-primary-100 flex h-8 w-full cursor-pointer appearance-none items-end rounded-xl border border-gray-200 bg-zinc-100/[0.8] pb-1 pl-4 pr-8 dark:bg-zinc-800/[0.8] md:h-14"
                  >
                    <option
                      v-for="i in product.stock"
                      :key="i"
                      class="text-primary-700 dark:text-primary-100"
                      :value="i"
                      :selected="i === selectorQuantity"
                    >
                      {{ i }}
                    </option>
                  </select>

                  <svg
                    class="text-primary-700 dark:text-primary-100 absolute bottom-0 right-0 mb-2 mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                    />
                  </svg>
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
          :reviews-count="product.reviewCounter"
          display-image-of="user"
        />
      </div>
    </PageBody>
  </PageWrapper>
</template>
