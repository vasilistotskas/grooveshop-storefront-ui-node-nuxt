<script lang="ts" setup>
import type { PropType } from 'vue'

import type { ProductReview } from '~/types/product/review'

defineProps({
  reviewsAverage: {
    type: Number,
    required: false,
    default: 0,
  },
  reviewsCount: {
    type: Number,
    required: false,
    default: 0,
  },
  reviews: {
    type: Array as PropType<ProductReview[] | null>,
    required: true,
  },
  displayImageOf: {
    type: String as PropType<'user' | 'product'>,
    required: true,
    validator: (value: string) => ['user', 'product'].includes(value),
  },
})
</script>

<template>
  <div class="reviews-list grid gap-4">
    <ProductReviewsSummary
      :reviews-average="reviewsAverage"
      :reviews-count="reviewsCount"
      class="reviews-list-summary"
    />
    <div class="reviews-list-items grid gap-4">
      <ProductReviewsCard
        v-for="review in reviews"
        :key="review.id"
        :review="review"
        :display-image-of="displayImageOf"
        class="reviews-list-item dark:bg-primary-900 bg-primary-100 rounded border border-gray-900/10 p-4 dark:border-gray-50/[0.2]"
      />
    </div>
  </div>
</template>
