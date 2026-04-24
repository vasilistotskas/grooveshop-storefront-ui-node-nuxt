<script lang="ts" setup>
import { useShare } from '@vueuse/core'
import type { PropType } from 'vue'

const { productUrl } = useUrls()
const { t, locale } = useI18n()

const props = defineProps({
  product: { type: Object as PropType<Product>, required: true },
  showAddToFavouriteButton: { type: Boolean, required: false, default: true },
  showShareButton: { type: Boolean, required: false, default: true },
  showAddToCartButton: { type: Boolean, required: false, default: true },
  imgWidth: { type: Number, required: false, default: 420 },
  imgHeight: { type: Number, required: false, default: 420 },
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
const { getFavouriteIdByProductId } = userStore

const { contentShorten } = useText()

const { product } = toRefs(props)

// Get the correct product ID for URLs and API calls
// For search results (ProductMeiliSearchResult), use 'master' field
// For regular Product objects, use 'id' field
const productId = computed(() => {
  if ('master' in product.value && typeof product.value.master === 'number') {
    return product.value.master
  }
  return product.value.id
})

const productName = computed(() => {
  if (!product.value) return undefined
  if ('name' in product.value && typeof product.value.name === 'string') {
    return product.value.name
  }
  return extractTranslated(product.value, 'name', locale.value)
})

const productDescription = computed(() => {
  if (!product.value) return ''
  if ('description' in product.value && typeof product.value.description === 'string') {
    return product.value.description
  }
  return extractTranslated(product.value, 'description', locale.value) || ''
})

const alt = computed(() => productName.value)

const isLowStock = computed(() => {
  const stock = product.value?.stock ?? 0
  if (stock <= 0) return false
  const lowStockThreshold = (product.value as { lowStockThreshold?: number })?.lowStockThreshold
  const threshold = typeof lowStockThreshold === 'number' && lowStockThreshold > 0 ? lowStockThreshold : 10
  return stock <= threshold
})

const shareOptions = computed(() => ({
  title: productName.value || '',
  text: productDescription.value,
  url: import.meta.client ? productUrl(productId.value, product.value.slug) : '',
}))
const { share, isSupported } = useShare(shareOptions)
const startShare = async () => {
  try {
    await share()
  }
  catch (error) {
    log.error({ action: 'share:failed', error })
  }
}

const favouriteId = computed(
  () => getFavouriteIdByProductId(productId.value),
)

const onFavouriteDelete = (id: number) => emit('favourite-delete', id)
</script>

<template>
  <UCard
    as="li"
    class="
      product-card group relative h-full w-full max-w-full transition-all duration-300
      hover:shadow-xl hover:scale-[1.02]
      focus-within:ring-1 focus-within:ring-primary focus-within:ring-offset-1
    "
    :ui="{
      root: 'w-full max-w-full',
      body: `
        p-0
        sm:p-0
      `,
    }"
  >
    <div
      class="
        relative overflow-hidden bg-white
        dark:bg-neutral-800
      "
    >
      <div class="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <UBadge
          v-if="product.discountPercent && product.discountPercent > 0"
          color="error"
          variant="soft"
          size="lg"
          class="w-fit font-bold"
        >
          -{{ Math.round(product.discountPercent) }}%
        </UBadge>
        <UBadge
          v-if="product.stock === 0"
          color="neutral"
          variant="solid"
          size="md"
          class="w-fit"
        >
          {{ t('out_of_stock') }}
        </UBadge>
        <UBadge
          v-else-if="isLowStock"
          color="warning"
          variant="solid"
          size="md"
          class="w-fit"
        >
          {{ t('only_n_left', { count: product.stock }) }}
        </UBadge>
      </div>

      <div class="absolute top-4 right-4 z-10 flex gap-2">
        <ClientOnly>
          <UButton
            v-if="isSupported && showShareButton"
            :disabled="!isSupported"
            :aria-label="t('share')"
            icon="i-heroicons-share"
            size="md"
            color="neutral"
            square
            variant="soft"
            :title="t('share')"
            @click.stop="startShare"
          />
          <!-- SSR placeholder: a dimensionally-identical disabled
               button — not a skeleton — so no CLS when Web Share
               hydrates (support detection is client-only). -->
          <template #fallback>
            <UButton
              v-if="showShareButton"
              disabled
              :aria-hidden="true"
              tabindex="-1"
              icon="i-heroicons-share"
              size="md"
              color="neutral"
              square
              variant="soft"
            />
          </template>
        </ClientOnly>
        <LazyButtonProductAddToFavourite
          v-if="showAddToFavouriteButton"
          :product-id="productId"
          :user-id="user?.id"
          :favourite-id="favouriteId"
          size="md"
          @favourite-delete="onFavouriteDelete"
        />
      </div>

      <NuxtLink
        :to="{ path: productUrl(productId, product.slug) }"
        :aria-label="`${t('view_product')}: ${alt}`"
        class="block"
      >
        <div
          class="aspect-4/3 max-w-full overflow-hidden"
          :class="{
            // Dim out-of-stock products so browsing scannability
            // reflects availability, not just the badge.
            'opacity-60 grayscale': product.stock === 0,
          }"
        >
          <ImgWithFallback
            :loading="imgLoading"
            class="size-full max-w-full bg-white object-contain"
            :src="product.mainImagePath"
            :width="imgWidth"
            :height="imgHeight"
            fit="contain"
            :background="'transparent'"
            :alt="alt"
            quality="100"
            densities="x1"
          />
        </div>
      </NuxtLink>
    </div>

    <div class="flex flex-col gap-4 p-4">
      <NuxtLink
        :to="{ path: productUrl(productId, product.slug) }"
        class="group/link"
        :aria-label="`${t('view_product')}: ${productName}`"
      >
        <h3
          class="
            line-clamp-2 text-lg leading-snug font-bold text-neutral-950 min-h-12
            transition-colors
            group-hover/link:text-primary-600
            dark:text-neutral-50 dark:group-hover/link:text-primary-400
          "
        >
          {{ productName }}
        </h3>
      </NuxtLink>

      <p
        v-if="showDescription"
        class="
          line-clamp-2 min-h-10 text-sm leading-relaxed text-neutral-700
          dark:text-neutral-300
        "
      >
        {{ contentShorten(productDescription, 0, 100) }}
      </p>

      <div
        v-if="product.reviewAverage && product.reviewAverage > 0" class="
          flex items-center gap-2
        "
      >
        <div v-once class="flex items-center">
          <UIcon
            v-for="star in 5"
            :key="star"
            :name="star <= Math.round(product.reviewAverage) ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
            class="size-4 text-warning"
          />
        </div>
        <span
          class="
            flex items-center gap-1 text-sm text-neutral-700
            dark:text-neutral-300
          "
        >
          {{ product.reviewAverage.toFixed(1) }}
          <span v-if="product.reviewCount" class="text-xs">
            ({{ product.reviewCount }})
          </span>
        </span>
      </div>

      <div v-else class="h-5" />

      <div class="flex flex-col gap-2">
        <div
          v-if="showStartPrice && product.price !== product.finalPrice"
          class="flex items-center gap-2"
        >
          <span
            class="
              text-sm text-neutral-500 line-through
              dark:text-neutral-300
            "
          >
            {{ $i18n.n(product.price, 'currency') }}
          </span>
        </div>

        <div class="flex items-baseline justify-between">
          <div class="flex flex-col gap-1">
            <span
              class="
                text-xs text-neutral-600
                dark:text-neutral-300
              "
            >
              {{ t('total_price') }}
            </span>
            <span
              class="
                text-2xl font-bold text-neutral-950
                dark:text-neutral-50
              "
            >
              {{ $i18n.n(product.finalPrice, 'currency') }}
            </span>
          </div>
          <span
            v-if="showVat && product.vatPercent"
            class="
              text-xs text-neutral-600
              dark:text-neutral-300
            "
          >
            {{ t('vat_included') }} {{ product.vatPercent }}%
          </span>
        </div>
      </div>

      <LazyButtonProductAddToCart
        v-if="showAddToCartButton"
        :product="product"
        :quantity="1"
        :text="t('add_to_cart')"
        class="
          w-full transition-all duration-300
          hover:scale-105
        "
      />
    </div>
  </UCard>
</template>

<i18n lang="yaml">
el:
  price: Τιμή
  vat_percent: Ποσοστό ΦΠΑ
  vat_included: ΦΠΑ περιλαμβάνεται
  total_price: Τελική Τιμή
  share: Κοινοποίηση
  add_to_cart: Αγορά
  out_of_stock: Εξαντλημένο
  low_stock: Τελευταία κομμάτια
  only_n_left: Μόνο {count} απέμεινε | Μόνο {count} απέμειναν
  view_product: Προβολή προϊόντος
</i18n>

<style scoped>
/**
 * Reduced motion support for Product Card
 * Disables animations and transitions for users who prefer reduced motion
 */
@media (prefers-reduced-motion: reduce) {
  .product-card {
    transition: none;
  }

  .product-card:hover {
    transform: none;
    scale: 1;
  }

  :deep(.transition-all),
  :deep(.transition-colors),
  :deep(.transition-transform) {
    transition: none;
  }
}
</style>
