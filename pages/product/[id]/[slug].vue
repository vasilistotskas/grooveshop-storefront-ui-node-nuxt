<script lang="ts" setup>
import { isClient } from '@vueuse/shared'
import { useShare } from '@vueuse/core'
import { capitalize } from '~/utils/str'
import type { Review } from '~/types/product/review'

const { isAuthenticated } = useAuthSession()

const productStore = useProductStore()
const { product } = storeToRefs(productStore)
const { fetchProduct } = productStore

const userStore = useUserStore()
const { account } = storeToRefs(userStore)
const { getIsProductInFavourites, getUserToProductFavourite } = userStore

const productReviewStore = useProductReviewStore()
const { userHadReviewed } = storeToRefs(productReviewStore)
const { fetchUserHadReviewed, fetchUserToProductReview } = productReviewStore

const route = useRoute('product-id-slug___en')
const config = useRuntimeConfig()
const { t, locale } = useI18n()
const { extractTranslated } = useTranslationExtractor()

const fullPath = config.public.baseUrl + route.fullPath
const productId = route.params.id
const existingReview = ref<Review | null>(null)

await fetchProduct(productId)

if (!product) {
	throw createError({ statusCode: 404, statusMessage: t('common.error.page.not.found') })
}

const refreshProduct = async () => await fetchProduct(productId)
const refreshUserHadReviewed = async () =>
	await fetchUserHadReviewed({
		product: String(productId),
		user: String(account.value?.id)
	})
const refreshUserToProductReview = async () =>
	await fetchUserToProductReview({
		productId: String(productId),
		userId: String(account.value?.id) || undefined,
		expand: 'true'
	})

await fetchUserToProductReview({
	productId: String(productId),
	userId: String(account.value?.id) || undefined,
	expand: 'true'
}).then((response) => {
	existingReview.value = response?.data || null
})

if (account.value?.id) {
	await fetchUserHadReviewed({
		product: String(productId),
		user: String(account.value?.id)
	})
}

const onAddExistingReview = async () => {
	await refreshUserHadReviewed()
	await refreshUserToProductReview().then((response) => {
		existingReview.value = response?.data || null
	})
}
const onUpdateExistingReview = async () => {
	await refreshUserHadReviewed()
	await refreshUserToProductReview().then((response) => {
		existingReview.value = response?.data || null
	})
}
const onDeleteExistingReview = async () => {
	await refreshUserHadReviewed()
	await refreshUserToProductReview().then((response) => {
		existingReview.value = response?.data || null
	})
}

const productTitle = computed(() => {
	return capitalize(
		product.value?.seoTitle ||
			extractTranslated(product.value, 'name', locale.value) ||
			''
	)
})
const selectorQuantity = ref(1)

const shareOptions = ref({
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
	() => refreshProduct()
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
	layout: 'default'
})
</script>

<template>
	<PageWrapper class="container">
		<PageBody>
			<div v-if="product" class="product mb-12 md:mb-24">
				<div class="max-w-7xl mx-auto md:px-4 sm:px-6 lg:px-8 pb-6">
					<UBreadcrumb :links="links" class="mb-5 pl-4" />
					<div class="grid md:grid-cols-2 gap-2">
						<div class="overflow-hidden md:px-4">
							<ProductImages :product="product" />
						</div>
						<div class="grid gap-6 px-4 items-center content-center">
							<h2
								class="leading-tight tracking-tight font-bold text-primary-700 dark:text-primary-100 text-2xl md:text-3xl"
							>
								{{ extractTranslated(product, 'name', locale) }}
							</h2>
							<PageSection class="actions flex gap-4 items-center">
								<ClientOnly>
									<MainButton
										v-if="isSupported"
										:disabled="!isSupported"
										type="button"
										:text="
											isSupported
												? $t('pages.product.share')
												: $t('pages.product.share_not_supported')
										"
										@click="startShare"
									/>
									<template #fallback>
										<ClientOnlyFallback height="40px" width="92.5px" />
									</template>
								</ClientOnly>
								<ProductReview
									:existing-review="existingReview"
									:user-had-reviewed="userHadReviewed"
									:product="product"
									:user="account || undefined"
									:is-authenticated="isAuthenticated"
									@add-existing-review="onAddExistingReview"
									@update-existing-review="onUpdateExistingReview"
									@delete-existing-review="onDeleteExistingReview"
								/>
								<LottieAddToFavourite
									:product-id="product.id"
									:user-id="account?.id"
									:is-favourite="productInUserFavourites"
									:favourite="userToProductFavourite"
									:is-authenticated="isAuthenticated"
								/>
							</PageSection>
							<h3 class="text-primary-700 dark:text-primary-100 text-sm">
								<span>{{ $t('pages.product.product_id') }}: </span>
								<span class="text-indigo-700 dark:text-indigo-200 hover:underline">{{
									product.id
								}}</span>
							</h3>

							<div class="flex items-center gap-4">
								<div>
									<div class="rounded-lg bg-zinc-100 flex py-2 px-3">
										<span class="text-indigo-400 mr-1 mt-1">$</span>
										<span class="font-bold text-indigo-600 text-3xl">{{
											product.finalPrice
										}}</span>
									</div>
								</div>
								<div class="flex-1">
									<p class="text-green-500 text-xl font-semibold">
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
							<div class="flex space-x-4">
								<div class="relative">
									<div
										class="text-center left-0 pt-2 right-0 absolute block text-xs uppercase text-primary-700 dark:text-primary-100 tracking-wide font-semibold"
									>
										<label for="quantity">{{ $t('pages.product.qty') }}</label>
									</div>
									<select
										id="quantity"
										v-model="selectorQuantity"
										class="bg-zinc-100/[0.8] dark:bg-zinc-800/[0.8] text-primary-700 dark:text-primary-100 cursor-pointer appearance-none rounded-xl border border-gray-200 pl-4 pr-8 h-14 flex items-end pb-1"
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
										class="w-5 h-5 text-primary-700 dark:text-primary-100 absolute right-0 bottom-0 mb-2 mr-2"
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
									:quantity="(selectorQuantity as number) || 1"
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
