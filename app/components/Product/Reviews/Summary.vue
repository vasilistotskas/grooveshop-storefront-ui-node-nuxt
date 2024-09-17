<script lang="ts" setup>
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
  maxRate: {
    type: Number,
    required: false,
    default: 10,
  },
})

const { t } = useI18n({ useScope: 'local' })
</script>

<template>
  <div class="flex items-center justify-center gap-8">
    <div
      v-if="reviewsAverage > 0"
      class="flex items-center gap-1"
    >
      <span
        class="
          text-3xl font-semibold text-secondary

          dark:text-secondary-dark
        "
      >{{ reviewsAverage.toFixed(1) }}</span>
      <span
        class="
          text-sm font-semibold text-secondary

          dark:text-secondary-dark
        "
      >/{{ maxRate }}</span>
    </div>
    <div class="flex items-center gap-1">
      <span
        class="
          text-sm font-semibold text-secondary

          dark:text-secondary-dark
        "
      >
        {{ t('reviews.summary', reviewsCount) }}
      </span>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  reviews:
    summary: Δεν υπάρχουν Αξιολογήσεις | 1 Αξιολόγηση | {n} Αξιολογήσεις
</i18n>
