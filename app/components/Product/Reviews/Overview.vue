<script lang="ts" setup>
/**
 * The product page's review summary: the average in large figures with
 * its stars, and how many reviews it rests on.
 *
 * Under them one bar per star, bucketed from the API's per-rate counts
 * (`starBuckets`): a store with reviews but no distribution draws none.
 */
const props = defineProps<{
  /** The model's average, on its 1..10 scale. */
  average: number
  count: number
  distribution: RatingDistribution[]
}>()

const { t, n } = useStoreI18n('components/Product/Reviews/Overview')

const figure = computed(() => n(props.average / 2, { minimumFractionDigits: 1, maximumFractionDigits: 1 }))
const buckets = computed(() => starBuckets(props.distribution))
// No counted review in any bucket: no bars, rather than five 0% rows
// beside a positive review count.
const hasDistribution = computed(() => buckets.value.some(bucket => bucket.count > 0))
</script>

<template>
  <div
    v-if="count > 0"
    class="flex w-full flex-col gap-4"
  >
    <div class="flex items-center gap-3.5">
      <span class="font-display text-[3.5rem]/none font-bold text-highlighted">{{ figure }}</span>
      <div class="flex flex-col gap-1">
        <ProductReviewsStars
          :rate="average"
          size="sm"
        />
        <span class="text-[0.8125rem] text-toned">{{ t('based_on', { count }, count) }}</span>
      </div>
    </div>
    <ul
      v-if="hasDistribution"
      class="flex flex-col gap-1.5"
      :aria-label="t('distribution')"
    >
      <li
        v-for="bucket in buckets"
        :key="bucket.stars"
        class="flex items-center gap-2.5 text-xs text-toned"
      >
        <span class="w-5 shrink-0">{{ t('star_label', { n: bucket.stars }) }}</span>
        <UProgress
          :model-value="bucket.percent"
          :max="100"
          size="xs"
          color="primary"
          class="flex-1"
          :aria-label="t('bucket', { n: bucket.stars, count: bucket.count }, bucket.count)"
        />
        <span class="w-9 shrink-0 text-right tabular-nums">{{ bucket.percent }}%</span>
      </li>
    </ul>
  </div>
  <p
    v-else
    class="text-toned"
  >
    {{ t('none') }}
  </p>
</template>

<i18n lang="yaml">
el:
  based_on: "Από {count} αξιολόγηση | Από {count} αξιολογήσεις"
  distribution: Κατανομή αξιολογήσεων
  star_label: "{n}★"
  bucket: "{n} αστέρια: {count} αξιολόγηση | {n} αστέρια: {count} αξιολογήσεις"
  none: Δεν υπάρχουν ακόμα αξιολογήσεις. Γράψε την πρώτη.
en:
  based_on: "Based on {count} review | Based on {count} reviews"
  distribution: Rating breakdown
  star_label: "{n}★"
  bucket: "{n} stars: {count} review | {n} stars: {count} reviews"
  none: No reviews yet. Be the first to write one.
</i18n>
