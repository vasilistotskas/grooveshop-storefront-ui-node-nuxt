<script lang="ts" setup>
import type { PropType } from 'vue'

import type { ProductFavourite } from '~/types/product/favourite'

defineProps({
  favourites: {
    type: Array as PropType<ProductFavourite[] | null>,
    required: true,
  },
  displayTotal: {
    type: Boolean,
    required: false,
    default: true,
  },
})
</script>

<template>
  <div v-if="favourites" class="grid w-full items-start gap-4">
    <div v-if="displayTotal" class="flex items-center justify-center gap-1">
      <span class="text-sm font-semibold text-secondary">
        {{
          $t('components.favourite.list.favourites.total', favourites.length)
        }}
      </span>
    </div>
    <ul class="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
      <template v-for="favourite in favourites" :key="favourite.id">
        <ProductCard
          v-if="!isEntityId(favourite.product)"
          :product="favourite.product"
          :show-add-to-cart-button="false"
          :img-width="260"
          :img-height="150"
        />
      </template>
    </ul>
  </div>
</template>
