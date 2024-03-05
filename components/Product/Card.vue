<script lang="ts" setup>
import { useShare } from '@vueuse/core'
import { isClient } from '@vueuse/shared'
import type { PropType } from 'vue'

import type { ImageLoading } from '~/types/global/general'
import type { Product } from '~/types/product/product'

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

const userStore = useUserStore()
const { user, loggedIn } = useUserSession()
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

const shareOptions = reactive({
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
      class="container rounded-lg bg-white p-5 text-white dark:bg-zinc-800 dark:text-black"
    >
      <div class="grid gap-4">
        <div class="max-w-full">
          <div class="grid">
            <Anchor :to="`/product${product.absoluteUrl}`" :text="alt">
              <ImgWithFallback
                :loading="imgLoading"
                provider="mediaStream"
                class="bg-transparent bg-white object-cover"
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
        <div class="relative flex flex-1 flex-col justify-end gap-2">
          <div class="flex justify-between gap-4">
            <h2 class="text-lg font-semibold leading-6">
              <Anchor
                :to="`/product${product.absoluteUrl}`"
                :text="alt"
                class="text-primary-700 dark:text-primary-100"
              >
                {{ extractTranslated(product, 'name', locale) }}
              </Anchor>
            </h2>
            <div class="flex h-6 gap-4">
              <ClientOnly>
                <UButton
                  v-if="isSupported && showShareButton"
                  :disabled="!isSupported"
                  :aria-label="$t('components.product.card.share')"
                  icon="i-heroicons-share"
                  size="lg"
                  color="white"
                  square
                  variant="solid"
                  class="font-extrabold capitalize"
                  @click="startShare"
                />
                <template #fallback>
                  <ClientOnlyFallback height="24px" width="40px" />
                </template>
              </ClientOnly>
              <ButtonAddToFavourite
                v-if="showAddToFavouriteButton"
                :product-id="product.id"
                :user-id="user?.id"
                :is-favourite="productInUserFavourites"
                :favourite="userToProductFavourite"
                :is-authenticated="loggedIn"
                size="lg"
              />
            </div>
          </div>
          <p
            v-if="showDescription"
            class="text-primary-700 dark:text-primary-100 text-muted min-h-[3.75rem] text-sm leading-6"
          >
            {{
              contentShorten(extractTranslated(product, 'description', locale), 0, 100)
            }}
          </p>
          <div v-if="showStartPrice || showVat" class="grid">
            <div v-if="showStartPrice" class="d-flex justify-content-between">
              <p>
                <span class="text-primary-700 dark:text-primary-100">{{
                  $t('components.product.card.price')
                }}</span><span class="text-primary-700 dark:text-primary-100">{{
                  product.price
                }}</span>
              </p>
            </div>
            <div v-if="showVat" class="card-vat-percent d-flex justify-content-between">
              <p class="card-prices-vat-percent">
                <span class="text-primary-700 dark:text-primary-100">{{
                  $t('components.product.card.vat_percent')
                }}</span><span class="text-primary-700 dark:text-primary-100">{{
                  product.vatPercent
                }}</span>
              </p>
            </div>
          </div>
          <div class="flex justify-between font-bold">
            <p class="grid grid-cols-[1fr_auto] items-center gap-2">
              <span class="text-primary-700 dark:text-primary-100 text-sm leading-6">
                {{ $t('components.product.card.total_price') }}
              </span>
              <I18nN
                tag="span"
                class="text-primary-700 dark:text-primary-100 text-lg leading-6"
                format="currency"
                :value="product.finalPrice"
              />
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
