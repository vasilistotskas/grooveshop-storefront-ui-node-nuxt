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
const { t, locale } = useLang()
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

const { data } = await fetchUserToProductReview({
	productId: String(productId),
	userId: String(account.value?.id) || undefined,
	expand: 'true'
})

if (data) {
	existingReview.value = data
}

if (account.value?.id) {
	await fetchUserHadReviewed({
		product: String(productId),
		user: String(account.value?.id)
	})
}

const onAddExistingReview = async () => {
	await refreshUserHadReviewed()
	const { data: refreshedExistingReview } = await refreshUserToProductReview()
	existingReview.value = refreshedExistingReview
}
const onUpdateExistingReview = async () => {
	await refreshUserHadReviewed()
	const { data: refreshedExistingReview } = await refreshUserToProductReview()
	existingReview.value = refreshedExistingReview
}
const onDeleteExistingReview = async () => {
	await refreshUserHadReviewed()
	const { data: refreshedExistingReview } = await refreshUserToProductReview()
	existingReview.value = refreshedExistingReview
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

watch(
	() => route.query,
	() => refreshProduct()
)
definePageMeta({
	layout: 'page'
})
useServerSeoMeta({
	title: () => productTitle.value,
	description: () =>
		product.value?.seoDescription || (config.public.appDescription as string),
	ogImage: () => product.value?.mainImageAbsoluteUrl || ''
})
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

useServerHead(() => ({
	title: productTitle.value,
	meta: [
		{
			name: 'description',
			content: product.value?.seoDescription || (config.public.appDescription as string)
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
			<div v-if="product" class="product mb-12 md:mb-24">
				<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
					<div class="grid md:grid-cols-2 gap-2">
						<div class="overflow-hidden px-4">
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
