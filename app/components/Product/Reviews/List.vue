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
  <div class="grid gap-4">
    <ProductReviewsSummary
      :reviews-average="reviewsAverage"
      :reviews-count="reviewsCount"
    />
    <div class="grid gap-4">
      <ProductReviewsCard
        v-for="review in reviews"
        :key="review.id"
        :review="review"
        :display-image-of="displayImageOf"
        class="
          rounded border border-primary-500 bg-primary-100 p-4
          dark:border-primary-500 dark:bg-primary-900
        "
      />
    </div>
  </div>
</template>
