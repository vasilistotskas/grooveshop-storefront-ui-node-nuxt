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

const { t, n } = useI18n()

const outOfFive = computed(() => props.average / 2)
const buckets = computed(() => starBuckets(props.distribution))
const figure = computed(() => n(outOfFive.value, { minimumFractionDigits: 1, maximumFractionDigits: 1 }))
</script>

<template>
  <div
    v-if="count > 0"
    class="flex w-full flex-col gap-4"
  >
    <div class="flex items-center gap-3.5">
      <span class="font-display text-[3.5rem]/none font-bold text-highlighted">{{ figure }}</span>
      <div class="flex flex-col gap-1">
        <UInputRating
          :model-value="outOfFive"
          :step="0.5"
          size="sm"
          color="primary"
          icon="i-heroicons-star-solid"
          :ui="{ emptyIcon: 'text-(--ui-border-accented)' }"
          readonly
          :aria-label="t('rated', { n: figure })"
        />
        <span class="text-[0.8125rem] text-muted">{{ t('based_on', { count }, count) }}</span>
      </div>
    </div>
    <ul
      class="flex flex-col gap-1.5"
      :aria-label="t('distribution')"
    >
      <li
        v-for="bucket in buckets"
        :key="bucket.stars"
        class="flex items-center gap-2.5 text-xs text-muted"
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
    class="text-muted"
  >
    {{ t('none') }}
  </p>
</template>

<i18n lang="yaml">
el:
  rated: Βαθμολογία {n} στα 5
  based_on: "Από {count} αξιολόγηση | Από {count} αξιολογήσεις"
  distribution: Κατανομή αξιολογήσεων
  star_label: "{n}★"
  bucket: "{n} αστέρια: {count} αξιολόγηση | {n} αστέρια: {count} αξιολογήσεις"
  none: Δεν υπάρχουν ακόμα αξιολογήσεις. Γράψε την πρώτη.
en:
  rated: Rated {n} out of 5
  based_on: "Based on {count} review | Based on {count} reviews"
  distribution: Rating breakdown
  star_label: "{n}★"
  bucket: "{n} stars: {count} review | {n} stars: {count} reviews"
  none: No reviews yet. Be the first to write one.
</i18n>
