<script lang="ts" setup>
import type { PropType } from 'vue'

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
        class="
          reviews-list-item bg-primary-100 border-primary-500

          dark:bg-primary-900 dark:border-primary-500

          rounded border p-4
        "
      />
    </div>
  </div>
</template>
