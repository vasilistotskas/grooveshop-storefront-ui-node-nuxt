<script lang="ts" setup>
import { isClient } from '@vueuse/shared'
import { useShare } from '@vueuse/core'
import { capitalize } from '~/utils/str'
import { ReviewActionPayload, ReviewQuery } from '~/zod/product/review'
import { ProductQuery } from '~/zod/product/product'
import { GlobalEvents } from '~/events/global'
import emptyIcon from '~icons/mdi/package-variant-remove'

const router = useRouter()
const route = useRoute('product-id-slug___en')
const config = useRuntimeConfig()
const { t } = useLang()
const toast = useToast()

const productStore = useProductStore()
const authStore = useAuthStore()
const userStore = useUserStore()
const reviewsStore = useReviewsStore()

const fullPath = config.public.baseUrl + route.fullPath
const productId = route.params.id

const { account, favourites } = storeToRefs(userStore)
const { isAuthenticated } = storeToRefs(authStore)
const { product, pending, error } = storeToRefs(productStore)
const { userHadReviewed } = storeToRefs(reviewsStore)

try {
	await productStore.fetchProduct(productId)
} catch (error) {
	//
}

try {
	if (account.value?.id && productId) {
		await reviewsStore.fetchUserHadReviewed({
			product: String(productId),
			user: String(account.value?.id)
		})
	}
} catch (error) {
	//
}

const productRefresh = async () => await productStore.fetchProduct(productId)

const reviewsRefresh = async () =>
	await reviewsStore.fetchReviews(routePaginationParams.value)

const userHadReviewedRefresh = async () =>
	await reviewsStore.fetchUserHadReviewed({
		product: String(productId),
		user: String(account.value?.id)
	})

const routePaginationParams = ref<ReviewQuery>({
	productId: String(productId),
	page: Number(route.query.page) || undefined,
	ordering: route.query.ordering || '-createdAt',
	expand: 'true'
})

const productTitle = computed(() => {
	return capitalize(product.value?.seoTitle || product.value?.name || '')
})
const selectorQuantity = ref(1)
const productUrl = computed(() => {
	if (!product.value) return ''
	return `/product/${product.value?.id}/${product.value?.slug}`
})

const shareOptions = ref({
	title: product.value?.name,
	text: product.value?.description || '',
	url: isClient ? productUrl : ''
})
const { share, isSupported } = useShare(shareOptions)
const startShare = () => share().catch((err) => err)
const productInUserFavourites = computed(() => {
	if (!product.value) return false
	const productId = product.value?.id
	if (!productId) return false
	return userStore.getIsProductInFavourites(productId)
})

const userToProductFavourite = computed(() => {
	if (!product.value) return null
	const productId = product.value?.id
	if (!productId) return null
	return userStore.getUserToProductFavourite(productId)
})

const { data: existingReview, refresh: existingReviewRefresh } = await useAsyncData(
	'productReview',
	() =>
		reviewsStore.fetchUserToProductReview({
			productId: String(productId),
			userId: account.value?.id ? String(account.value.id) : undefined,
			expand: 'true'
		})
)
const reviewBus = useEventBus<string>('productReview')
const reviewsBus = useEventBus<string>('productReviews')
const modalBus = useEventBus<string>(GlobalEvents.GENERIC_MODAL)

reviewsBus.on((event, payload: ProductQuery) => {
	routePaginationParams.value = payload
	reviewsRefresh()
})

reviewBus.on((event, payload: ReviewActionPayload) => {
	switch (event) {
		case 'create':
			reviewsStore
				.addReview(
					{
						product: String(payload.productId),
						user: String(payload.userId),
						comment: payload.comment,
						rate: String(payload.rate),
						status: 'True'
					},
					{ expand: 'true' }
				)
				.then(() => {
					toast.success(t('pages.product.review.created.success'))
					productRefresh()
					existingReviewRefresh()
					userHadReviewedRefresh()
				})
				.catch((err) => {
					toast.error(err.message)
				})
				.finally(() => {
					modalBus.emit('modal-close-reviewModal')
				})
			break
		case 'update':
			reviewsStore
				.updateReview(payload.id, {
					product: String(payload.productId),
					user: String(payload.userId),
					comment: payload.comment,
					rate: String(payload.rate)
				})
				.then(() => {
					toast.success(t('pages.product.review.updated.success'))
					productRefresh()
					existingReviewRefresh()
					userHadReviewedRefresh()
				})
				.catch((err) => {
					toast.error(err.message)
				})
				.finally(() => {
					modalBus.emit('modal-close-reviewModal')
				})
			break
		case 'delete':
			reviewsStore
				.deleteReview(payload.id)
				.then(() => {
					toast.success(t('pages.product.review.deleted.success'))
					productRefresh()
					existingReviewRefresh()
					userHadReviewedRefresh()
				})
				.catch((err) => {
					toast.error(err.message)
				})
				.finally(() => {
					modalBus.emit('modal-close-reviewModal')
				})
			break
	}
})

watch(
	() => route.query,
	() => {
		reviewsBus.emit('update', {
			productId: String(productId),
			page: Number(route.query.page) || undefined,
			ordering: route.query.ordering || '-createdAt',
			expand: 'true'
		})
	}
)
const breadcrumbs = [
	// item is the url and will be resolved to the absolute url
	{ name: 'Home', item: '/' },
	{ name: 'Products', item: '/products' },
	// item is not required for the last list element
	{ name: 'How do breadcrumbs work' }
]
useSchemaOrg([
	defineBreadcrumb({
		itemListElement: breadcrumbs
	})
])
definePageMeta({
	middleware: ['product'],
	layout: 'page',
	customBreadcrumbs: true
})
useSeoMeta({
	title: () => productTitle.value,
	description: () => product.value?.seoDescription || config.public.appDescription,
	ogImage: () => product.value?.mainImageAbsoluteUrl || ''
})
useSchemaOrg([
	defineProduct({
		name: () => product.value?.name || '',
		description: () => product.value?.description || '',
		image: () => [product.value?.mainImageAbsoluteUrl || ''],
		sku: () => product.value?.uuid || '',
		offer: {
			price: () => (product.value?.price || 0).toFixed(2)
		}
	})
])

useHead(() => ({
	title: productTitle.value,
	meta: [
		{
			name: 'description',
			content: product.value?.seoDescription || config.public.appDescription
		},
		{
			name: 'keywords',
			content: product.value?.seoKeywords || ''
		},
		{
			property: 'og:title',
			content: product.value?.seoTitle || ''
		},
		{
			property: 'og:description',
			content: product.value?.seoDescription || ''
		},
		{
			property: 'og:image',
			content: product.value?.mainImageAbsoluteUrl || ''
		},
		{
			property: 'og:url',
			content: fullPath
		},
		{
			property: 'og:type',
			content: 'website'
		},
		{
			property: 'og:site_name',
			content: 'Groove Shop'
		},
		{
			property: 'twitter:card',
			content: 'summary_large_image'
		},
		{
			property: 'twitter:title',
			content: product.value?.seoTitle || ''
		},
		{
			property: 'twitter:description',
			content: product.value?.seoDescription || ''
		},
		{
			property: 'twitter:image',
			content: product.value?.mainImageAbsoluteUrl || ''
		},
		{
			property: 'twitter:url',
			content: fullPath
		}
	]
}))
</script>

<template>
	<PageWrapper class="gap-16">
		<PageBody>
			<Error
				v-if="error.product"
				:code="error.product?.statusCode"
				:error="error.product"
			/>
			<template v-if="!pending.product && product">
				<div class="product mb-12 md:mb-24">
					<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
						<div class="grid md:grid-cols-2 gap-2">
							<div class="md:flex-1 px-4">
								<ProductImages v-if="product" :product="product"></ProductImages>
							</div>
							<div class="grid gap-6 px-4 items-center content-center">
								<h2
									class="leading-tight tracking-tight font-bold text-gray-700 dark:text-gray-200 text-2xl md:text-3xl"
								>
									{{ product.name }}
								</h2>
								<PageSection class="actions flex gap-4">
									<ClientOnly>
										<Button
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
											<ClientOnlyFallback />
										</template>
									</ClientOnly>
									<ProductReview
										v-if="product"
										:existing-review="existingReview || undefined"
										:user-had-reviewed="userHadReviewed"
										:product="product"
										:user="account || undefined"
										:is-authenticated="isAuthenticated"
									></ProductReview>
									<LottieAddToFavourite
										:product-id="product.id"
										:user-id="account?.id"
										:is-favourite="productInUserFavourites"
										:favourite="userToProductFavourite"
										:is-authenticated="isAuthenticated"
									/>
								</PageSection>
								<h3 class="text-gray-700 dark:text-gray-200 text-sm">
									<span>{{ $t('pages.product.product_id') }}: </span>
									<span class="text-indigo-700 dark:text-indigo-200 hover:underline">{{
										product.id
									}}</span>
								</h3>

								<div class="flex items-center gap-4">
									<div>
										<div class="rounded-lg bg-gray-100 flex py-2 px-3">
											<span class="text-indigo-400 mr-1 mt-1">$</span>
											<span class="font-bold text-indigo-600 text-3xl">{{
												product.finalPrice
											}}</span>
										</div>
									</div>
									<div class="flex-1">
										<p class="text-green-500 text-xl font-semibold">
											{{ $t('pages.product.save') }} {{ product.priceSavePercent }}%
										</p>
										<p class="text-gray-700 dark:text-gray-200 text-sm">
											{{ $t('pages.product.inclusive_of_taxes') }}
										</p>
									</div>
								</div>
								<ReadMore :text="product.description || ''" :max-chars="100"></ReadMore>
								<div class="flex space-x-4">
									<div class="relative">
										<div
											class="text-center left-0 pt-2 right-0 absolute block text-xs uppercase text-gray-700 dark:text-gray-200 tracking-wide font-semibold"
										>
											<label for="quantity">{{ $t('pages.product.qty') }}</label>
										</div>
										<select
											id="quantity"
											v-model="selectorQuantity"
											class="bg-gray-100/[0.8] dark:bg-slate-800/[0.8] text-gray-700 dark:text-gray-200 cursor-pointer appearance-none rounded-xl border border-gray-200 pl-4 pr-8 h-14 flex items-end pb-1"
										>
											<option
												v-for="i in product.stock"
												:key="i"
												class="text-gray-700 dark:text-gray-200"
												:value="i"
												:selected="i === selectorQuantity"
											>
												{{ i }}
											</option>
										</select>

										<svg
											class="w-5 h-5 text-gray-700 dark:text-gray-200 absolute right-0 bottom-0 mb-2 mr-2"
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
										v-if="product"
										:product="product"
										:quantity="selectorQuantity as number || 1"
										:text="$t('pages.product.add_to_cart')"
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
				<ProductReviews
					:product-id="String(product.id)"
					:reviews-average="product.reviewAverage"
					:reviews-count="product.reviewCounter"
					display-image-of="user"
				>
				</ProductReviews>
			</template>
			<template v-if="!pending.product && !product">
				<EmptyState :icon="emptyIcon">
					<template #actions>
						<Button
							:text="$t('common.empty.button')"
							:type="'link'"
							:to="'index'"
						></Button>
					</template>
				</EmptyState>
			</template>
		</PageBody>
	</PageWrapper>
</template>
