<script lang="ts" setup>
import type { PropType } from 'vue'

defineProps({
  displayTotal: {
    type: Boolean,
    required: false,
    default: true,
  },
  favourites: {
    type: Array as PropType<ProductFavourite[] | null>,
    required: true,
  },
  favouritesTotal: {
    type: Number,
    required: false,
    default: 0,
  },
})

const emit = defineEmits([
  'refresh-favourites',
])

const { t } = useI18n({ useScope: 'local' })
</script>

<template>
  <div class="product-favourites-list grid gap-4">
    <div
      class="grid w-full items-start gap-4"
    >
      <div
        v-if="displayTotal"
        class="flex items-center justify-center gap-1"
      >
        <span class="text-sm font-semibold">
          {{ t('total.count', favouritesTotal) }}
        </span>
      </div>
      <ul
        class="
          grid grid-cols-2 gap-4

          md:grid-cols-3

          xl:grid-cols-4
        "
      >
        <template
          v-for="favourite in favourites"
          :key="favourite.id"
        >
          <LazyProductCard
            :img-height="150"
            :img-width="260"
            :product="{
              id: favourite.product as number,
              slug: '',
              translations: {
                el: { name: favourite.productName || 'Product' },
              },
              category: 0,
              price: favourite.productPrice || 0,
              vat: 0,
              viewCount: 0,
              createdAt: favourite.createdAt,
              updatedAt: favourite.createdAt,
              uuid: favourite.uuid,
              discountValue: 0,
              priceSavePercent: 0,
              vatPercent: 0,
              vatValue: 0,
              finalPrice: favourite.productPrice || 0,
              mainImagePath: '',
              reviewAverage: 0,
              reviewCount: 0,
              likesCount: 0,
            } as Product"
            :show-add-to-cart-button="false"
            @favourite-delete="(_id) => emit('refresh-favourites')"
          />
        </template>
      </ul>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  total:
    count: Κανένα Αγαπημένο | 1 Αγαπημένο | {count} Αγαπημένα
</i18n>
