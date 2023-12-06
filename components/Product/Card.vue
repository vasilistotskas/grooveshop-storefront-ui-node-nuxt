<script lang="ts" setup>
import { isClient } from '@vueuse/shared'
import { useShare } from '@vueuse/core'
import type { PropType } from 'vue'
import type { Product } from '~/types/product/product'
import type { ImageLoading } from '~/types/global/general'

const props = defineProps({
	product: { type: Object as PropType<Product>, required: true },
	showAddToFavouriteButton: { type: Boolean, required: false, default: true },
	showShareButton: { type: Boolean, required: false, default: true },
	showAddToCartButton: { type: Boolean, required: false, default: true },
	imgWidth: { type: Number, required: false, default: 250 },
	imgHeight: { type: Number, required: false, default: 230 },
	showVat: { type: Boolean, required: false, default: false },
	showStartPrice: { type: Boolean, required: false, default: false },
	showDescription: { type: Boolean, required: false, default: false },
	imgLoading: {
		type: String as PropType<ImageLoading>,
		required: false,
		default: undefined,
		validator: (value: string) => ['lazy', 'eager'].includes(value)
	}
})

const { isAuthenticated } = useAuthSession()

const userStore = useUserStore()
const { account } = storeToRefs(userStore)
const { getIsProductInFavourites, getUserToProductFavourite } = userStore

const { locale } = useLang()
const { contentShorten } = useText()
const { resolveImageSrc } = useImageResolver()
const { extractTranslated } = useTranslationExtractor()

const { product } = toRefs(props)

const productUrl = computed(() => {
	if (!props.product) return ''
	return `/product/${product.value.id}/${product.value.slug}`
})

const src = computed(() => {
	return resolveImageSrc(
		product.value?.mainImageFilename,
		`media/uploads/products/${product.value?.mainImageFilename}`
	)
})

const alt = computed(() => {
	return extractTranslated(product.value, 'name', locale.value)
})

const shareOptions = ref({
	title: extractTranslated(product.value, 'name', locale.value),
	text: extractTranslated(product.value, 'description', locale.value) || '',
	url: isClient ? productUrl : ''
})
const { share, isSupported } = useShare(shareOptions)
const startShare = () => share().catch((err) => err)

const productInUserFavourites = computed(() => {
	return getIsProductInFavourites(product.value?.id)
})

const userToProductFavourite = computed(() => {
	return getUserToProductFavourite(product.value?.id)
})
</script>

<template>
	<li v-if="product" class="product-card">
		<div
			class="container p-5 bg-white text-white dark:bg-zinc-800 dark:text-black rounded-lg"
		>
			<div class="card grid gap-2">
				<div class="card-head">
					<div class="card-thumb">
						<div class="card-thumb-container">
							<div class="card-thumb-image">
								<Anchor :to="`/product${product.absoluteUrl}`" :text="alt">
									<NuxtImg
										preload
										:loading="imgLoading"
										provider="mediaStream"
										class="product-img bg-transparent"
										:style="{ objectFit: 'contain', contentVisibility: 'auto' }"
										:width="imgWidth || 100"
										:height="imgHeight || 100"
										:fit="'contain'"
										:position="'entropy'"
										:background="'transparent'"
										:trim-threshold="5"
										:format="'webp'"
										sizes="`sm:100vw md:50vw lg:auto`"
										:src="src"
										:alt="alt"
									/>
								</Anchor>
							</div>
						</div>
					</div>
				</div>
				<div class="card-body gap-2">
					<div class="card-actions h-6 flex gap-4">
						<ClientOnly>
							<MainButton
								v-if="isSupported && showShareButton"
								:disabled="!isSupported"
								:text="
									isSupported
										? $t('components.product.card.share')
										: $t('components.product.card.share_not_supported')
								"
								size="xs"
								class="font-extrabold capitalize"
								@click="startShare"
							/>
							<template #fallback>
								<ClientOnlyFallback height="24px" width="64px" />
							</template>
						</ClientOnly>
						<ButtonAddToFavourite
							v-if="showAddToFavouriteButton"
							:product-id="product.id"
							:user-id="account?.id"
							:is-favourite="productInUserFavourites"
							:favourite="userToProductFavourite"
							:is-authenticated="isAuthenticated"
							size="xs"
						/>
					</div>
					<h2 class="card-title text-primary-700 dark:text-primary-100">
						<Anchor
							:to="`/product${product.absoluteUrl}`"
							:text="alt"
							css-class="card-title-text"
						>
							{{ extractTranslated(product, 'name', locale) }}
						</Anchor>
					</h2>
					<p
						v-if="showDescription"
						class="card-description text-primary-700 dark:text-primary-100 text-muted"
					>
						{{
							contentShorten(extractTranslated(product, 'description', locale), 0, 100)
						}}
					</p>
					<div class="card-prices">
						<div v-if="showStartPrice" class="card-price d-flex justify-content-between">
							<p class="card-prices-start-price">
								<span class="text-primary-700 dark:text-primary-100">{{
									$t('components.product.card.price')
								}}</span
								><span class="text-primary-700 dark:text-primary-100">{{
									product.price
								}}</span>
							</p>
						</div>
						<div v-if="showVat" class="card-vat-percent d-flex justify-content-between">
							<p class="card-prices-vat-percent">
								<span class="text-primary-700 dark:text-primary-100">{{
									$t('components.product.card.vat_percent')
								}}</span
								><span class="text-primary-700 dark:text-primary-100">{{
									product.vatPercent
								}}</span>
							</p>
						</div>
					</div>
					<div
						class="card-final-price d-flex justify-content-between total font-weight-bold mt-4"
					>
						<p class="card-final-price-total">
							<span
								class="card-final-price-total-text text-primary-700 dark:text-primary-100"
								>{{ $t('components.product.card.total_price') }}</span
							><span
								class="card-final-price-total-price text-primary-700 dark:text-primary-100"
								>{{ product.finalPrice }}</span
							>
						</p>
					</div>
				</div>
				<div class="card-footer">
					<ButtonAddToCart
						v-if="showAddToCartButton"
						:product="product"
						:quantity="1"
						:text="$t('components.product.card.add_to_cart')"
					/>
				</div>
			</div>
		</div>
	</li>
</template>

<style lang="scss" scoped>
.product-card {
	display: flex;
	flex-direction: column;
	min-height: 380px;

	.card-title {
		display: grid;
		align-items: center;

		&-text {
			font-size: 1.125rem;
			line-height: 1.5;
			font-weight: 600;
		}
	}

	.card-body {
		transition:
			transform 0.3s ease,
			-webkit-transform 0.3s ease;
		will-change: transform;
		display: flex;
		position: relative;
		flex: 1;
		flex-direction: column;
		align-items: flex-start;
		justify-content: flex-end;
	}

	.card-head {
		flex: 0 0 100%;
		max-width: 100%;
	}

	.card-footer {
		display: grid;
		align-items: center;
	}

	.card-description {
		font-size: 0.875rem;
		line-height: 1.5;
		min-height: 3.75rem;
	}

	.card-thumb {
		display: block;
		width: 100%;
	}

	.card-thumb-container {
		position: relative;
		width: 100%;
		padding-bottom: 100%;
	}

	.card-thumb-image {
		display: grid;
		position: absolute;
		border: 0;
		width: 100%;
		height: 100%;
		background: transparent;

		::v-deep(.product-img) {
			transition: all 300ms ease-in-out;
			font-size: 9px;
			line-height: 1.2;
			position: absolute;
			inset: 0;
			margin: auto;
			max-height: 100%;
			max-width: 100%;
		}
	}

	.card-final-price {
		&-total {
			display: grid;
			grid-template-columns: 1fr auto;
			align-items: center;
			gap: 0.5rem;

			&-text {
				font-size: 0.875rem;
				line-height: 1.5;
			}

			&-price {
				font-size: 1.125rem;
				line-height: 1.5;
				font-weight: 700;
			}
		}
	}
}
</style>
