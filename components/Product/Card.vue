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
	imgWidth: { type: Number, required: false, default: 324 },
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

const { locale } = useI18n()
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
	<li class="product-card">
		<div
			class="container p-5 bg-white text-white dark:bg-zinc-800 dark:text-black rounded-lg"
		>
			<div class="grid gap-4">
				<div class="max-w-full">
					<div class="grid">
						<Anchor :to="`/product${product.absoluteUrl}`" :text="alt">
							<NuxtImg
								:loading="imgLoading"
								provider="mediaStream"
								class="w-full h-auto bg-transparent object-cover"
								:style="{ objectFit: 'contain', contentVisibility: 'auto' }"
								:src="src"
								:width="imgWidth"
								:height="imgHeight"
								:fit="'contain'"
								:position="'entropy'"
								:background="'transparent'"
								:trim-threshold="5"
								sizes="`xs:405px sm:318px md:196px lg:196px xl:260px xxl:324px 2xl:324px`"
								:alt="alt"
								densities="x1"
							/>
						</Anchor>
					</div>
				</div>
				<div class="flex flex-col justify-end flex-1 relative gap-2">
					<div class="h-6 flex gap-4">
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
					<h2 class="text-lg font-semibold leading-6">
						<Anchor
							:to="`/product${product.absoluteUrl}`"
							:text="alt"
							class="text-primary-700 dark:text-primary-100"
						>
							{{ extractTranslated(product, 'name', locale) }}
						</Anchor>
					</h2>
					<p
						v-if="showDescription"
						class="text-sm leading-6 min-h-[3.75rem] text-primary-700 dark:text-primary-100 text-muted"
					>
						{{
							contentShorten(extractTranslated(product, 'description', locale), 0, 100)
						}}
					</p>
					<div class="grid">
						<div v-if="showStartPrice" class="d-flex justify-content-between">
							<p>
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
					<div class="flex justify-between font-bold mt-4">
						<p class="grid grid-cols-[1fr_auto] gap-2 items-center">
							<span class="text-sm leading-6 text-primary-700 dark:text-primary-100">
								{{ $t('components.product.card.total_price') }}
							</span>
							<span class="text-lg leading-6 text-primary-700 dark:text-primary-100">
								{{ product.finalPrice }}
							</span>
						</p>
					</div>
				</div>
				<div class="grid items-center">
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
