<script lang="ts" setup>
import { useShare } from '@vueuse/core'
import type { PropType } from 'vue'

const { productUrl } = useUrls()
const { locale } = useI18n()

const props = defineProps({
  product: { type: Object as PropType<Product>, required: true },
  showAddToFavouriteButton: { type: Boolean, required: false, default: true },
  showShareButton: { type: Boolean, required: false, default: true },
  showAddToCartButton: { type: Boolean, required: false, default: true },
  imgWidth: { type: Number, required: false, default: 580 },
  imgHeight: { type: Number, required: false, default: 325 },
  showVat: { type: Boolean, required: false, default: false },
  showStartPrice: { type: Boolean, required: false, default: false },
  showDescription: { type: Boolean, required: false, default: false },
  imgLoading: {
    type: String as PropType<ImageLoading>,
    required: false,
    default: undefined,
    validator: (value: string) => ['lazy', 'eager'].includes(value),
  },
})

const emit = defineEmits<{
  (e: 'favourite-delete', id: number): void
}>()

const { $i18n } = useNuxtApp()
const { user } = useUserSession()
const userStore = useUserStore()
const { getFavouriteByProductId } = userStore

const { t } = useI18n({ useScope: 'local' })
const { contentShorten } = useText()

const { product } = toRefs(props)

const alt = computed(() => {
  return extractTranslated(product?.value, 'name', locale.value)
})

const shareOptions = reactive({
  title: extractTranslated(product.value, 'name', locale.value),
  text: extractTranslated(product.value, 'description', locale.value) || '',
  url: import.meta.client ? productUrl(product.value.id, product.value.slug) : '',
})
const { share, isSupported } = useShare(shareOptions)
const startShare = async () => {
  try {
    await share()
  }
  catch (error) {
    console.error('Share failed:', error)
  }
}

const favouriteId = computed(
  () => getFavouriteByProductId(product.value.id)?.id,
)

const onFavouriteDelete = (id: number) => emit('favourite-delete', id)
</script>

<template>
  <li class="product-card relative">
    <div
      class="
        bg-primary-100 container rounded-lg

        dark:bg-primary-900
      "
    >
      <div class="flex flex-col gap-4 py-5 px-4">
        <div class="max-w-full">
          <div class="grid">
            <Anchor
              :to="{ path: productUrl(product.id, product.slug) }"
              :text="alt"
            >
              <ImgWithFallback
                :loading="imgLoading"
                class="bg-transparent"
                :style="{ objectFit: 'contain', contentVisibility: 'auto' }"
                :src="product.mainImagePath"
                :width="imgWidth"
                :height="imgHeight"
                fit="contain"
                :background="'transparent'"
                sizes="sm:330px md:290px lg:302px xl:280px xxl:410px 2xl:410px"
                :alt="alt"
                densities="x1"
              />
            </Anchor>
          </div>
        </div>
        <div class="flex flex-1 flex-col justify-end gap-2">
          <div
            class="
              grid items-center justify-between gap-2

              md:flex md:gap-4
            "
          >
            <h2 class="text-lg font-semibold leading-6">
              <Anchor
                :to="{ path: productUrl(product.id, product.slug) }"
                :text="alt"
                class="
                  text-primary-950

                  dark:text-primary-50
                "
              >
                {{ extractTranslated(product, 'name', locale) }}
              </Anchor>
            </h2>
            <div
              class="
                row-start-1 flex gap-1

                md:relative md:gap-4
              "
            >
              <ClientOnly>
                <UButton
                  v-if="isSupported && showShareButton"
                  :disabled="!isSupported"
                  :aria-label="t('share')"
                  icon="i-heroicons-share"
                  size="lg"
                  color="neutral"
                  square
                  variant="ghost"
                  class="font-extrabold capitalize"
                  :title="t('share')"
                  @click="startShare"
                />
                <template #fallback>
                  <USkeleton
                    class="h-8 w-8"
                  />
                </template>
              </ClientOnly>
              <LazyButtonProductAddToFavourite
                v-if="showAddToFavouriteButton"
                :product-id="product.id"
                :user-id="user?.id"
                :favourite-id="favouriteId"
                size="lg"
                @favourite-delete="onFavouriteDelete"
              />
            </div>
          </div>
          <p
            v-if="showDescription"
            class="
              text-primary-950 text-muted min-h-[3.75rem] text-sm leading-6

              dark:text-primary-50
            "
          >
            {{
              contentShorten(
                extractTranslated(product, 'description', locale),
                0,
                100,
              )
            }}
          </p>
          <div
            v-if="showStartPrice || showVat"
            class="grid"
          >
            <div
              v-if="showStartPrice"
              class="d-flex justify-content-between"
            >
              <p>
                <span
                  class="
                    text-primary-950

                    dark:text-primary-50
                  "
                >{{
                  t('price')
                }}</span><span
                  class="
                    text-primary-950

                    dark:text-primary-50
                  "
                >{{
                  product.price
                }}</span>
              </p>
            </div>
            <div
              v-if="showVat"
              class="card-vat-percent d-flex justify-content-between"
            >
              <p class="card-prices-vat-percent">
                <span
                  class="
                    text-primary-950

                    dark:text-primary-50
                  "
                >{{
                  t('vat_percent')
                }}</span><span
                  class="
                    text-primary-950

                    dark:text-primary-50
                  "
                >{{
                  product.vatPercent
                }}</span>
              </p>
            </div>
          </div>
          <div class="flex justify-between font-bold">
            <p
              class="
                grid items-center gap-2
              "
            >
              <span
                class="
                  text-primary-950 text-sm leading-6

                  dark:text-primary-50
                "
              >
                {{ t('total_price') }}
              </span>
              <span
                class="
                  text-primary-950 text-lg leading-6

                  dark:text-primary-50
                "
              >
                {{ $i18n.n(product.finalPrice, 'currency') }}
              </span>
            </p>
          </div>
        </div>
        <div class="grid place-items-center">
          <LazyButtonProductAddToCart
            v-if="showAddToCartButton"
            :product="product"
            :quantity="1"
            :text="t('add_to_cart')"
          />
        </div>
      </div>
    </div>
  </li>
</template>

<i18n lang="yaml">
el:
  price: Τιμή
  vat_percent: Ποσοστό ΦΠΑ
  total_price: Συνολικό ποσό
  share: Share
  add_to_cart: Προσθήκη στο καλάθι
</i18n>
