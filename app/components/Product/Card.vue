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

const alt = computed(() => {
  // Handle both Product (with translations) and ProductMeiliSearchResult (flat structure)
  if (product?.value) {
    // Check if it's a search result (has name directly)
    if ('name' in product.value && typeof product.value.name === 'string') {
      return product.value.name
    }
    // Otherwise use extractTranslated for full Product objects
    return extractTranslated(product.value, 'name', locale.value)
  }
  return undefined
})

const shareOptions = reactive({
  title: 'name' in product.value && typeof product.value.name === 'string'
    ? product.value.name
    : extractTranslated(product.value, 'name', locale.value) || '',
  text: 'description' in product.value && typeof product.value.description === 'string'
    ? product.value.description
    : extractTranslated(product.value, 'description', locale.value) || '',
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
  () => getFavouriteIdByProductId(product.value.id),
)

const onFavouriteDelete = (id: number) => emit('favourite-delete', id)
</script>

<template>
  <UCard
    as="li"
    class="
      group relative h-full w-full max-w-full transition-all duration-300
      hover:shadow-xl
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
        dark:bg-primary-800
      "
    >
      <div class="absolute top-3 left-3 z-10 flex flex-col gap-2">
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
          size="sm"
          class="w-fit"
        >
          {{ t('out_of_stock') }}
        </UBadge>
        <UBadge
          v-else-if="product.stock && product.stock < 10"
          color="warning"
          variant="solid"
          size="sm"
          class="w-fit"
        >
          {{ t('low_stock') }}
        </UBadge>
      </div>

      <div class="absolute top-3 right-3 z-10 flex gap-2">
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
          <template #fallback>
            <USkeleton class="size-8 rounded-md" />
          </template>
        </ClientOnly>
        <LazyButtonProductAddToFavourite
          v-if="showAddToFavouriteButton"
          :product-id="product.id"
          :user-id="user?.id"
          :favourite-id="favouriteId"
          size="md"
          @favourite-delete="onFavouriteDelete"
        />
      </div>

      <NuxtLink
        :to="{ path: productUrl(product.id, product.slug) }"
        :aria-label="alt"
        class="block"
      >
        <div class="aspect-square max-w-full overflow-hidden">
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

    <div class="flex flex-col gap-3 p-4">
      <NuxtLink
        :to="{ path: productUrl(product.id, product.slug) }"
        class="group/link"
      >
        <h3
          class="
            line-clamp-2 text-base leading-tight font-bold text-primary-950
            transition-colors
            group-hover/link:text-primary-600
            md:text-lg
            dark:text-primary-50 dark:group-hover/link:text-primary-400
          "
        >
          {{ 'name' in product && typeof product.name === 'string' ? product.name : extractTranslated(product, 'name', locale) }}
        </h3>
      </NuxtLink>

      <p
        v-if="showDescription"
        class="
          line-clamp-2 min-h-10 text-sm leading-relaxed text-primary-700
          dark:text-primary-300
        "
      >
        {{
          contentShorten(
            'description' in product && typeof product.description === 'string'
              ? product.description
              : extractTranslated(product, 'description', locale),
            0,
            100,
          )
        }}
      </p>

      <div
        v-if="product.reviewAverage && product.reviewAverage > 0" class="
          flex items-center gap-2
        "
      >
        <div class="flex items-center">
          <UIcon
            v-for="star in 5"
            :key="star"
            :name="star <= Math.round(product.reviewAverage) ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
            class="size-4 text-warning"
          />
        </div>
        <span
          class="
            flex items-center gap-1 text-sm text-primary-700
            dark:text-primary-300
          "
        >
          {{ product.reviewAverage.toFixed(1) }}
          <span v-if="product.reviewCount" class="text-xs">
            ({{ product.reviewCount }})
          </span>
        </span>
      </div>

      <div class="flex flex-col gap-2">
        <div
          v-if="showStartPrice && product.price !== product.finalPrice"
          class="flex items-center gap-2"
        >
          <span
            class="
              text-sm text-primary-600 line-through
              dark:text-primary-400
            "
          >
            {{ $i18n.n(product.price, 'currency') }}
          </span>
        </div>

        <div class="flex items-baseline justify-between">
          <div class="flex flex-col">
            <span
              class="
                text-xs text-primary-600
                dark:text-primary-400
              "
            >
              {{ t('total_price') }}
            </span>
            <span
              class="
                text-2xl font-bold text-primary-950
                dark:text-primary-50
              "
            >
              {{ $i18n.n(product.finalPrice, 'currency') }}
            </span>
          </div>
          <span
            v-if="showVat && product.vatPercent"
            class="
              text-xs text-primary-600
              dark:text-primary-400
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
</i18n>
