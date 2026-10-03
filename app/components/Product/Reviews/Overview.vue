<script lang="ts" setup>
/**
 * The product page's review summary: the average in large figures with
 * its stars, and how many reviews it rests on.
 *
 * No star distribution: the API returns the average and the count only
 * (PLAN F5), and bars drawn from anything else would be invented.
 */
const props = defineProps<{
  /** The model's average, on its 1..10 scale. */
  average: number
  count: number
}>()

const { t, n } = useI18n()

const outOfFive = computed(() => props.average / 2)
const figure = computed(() => n(outOfFive.value, { minimumFractionDigits: 1, maximumFractionDigits: 1 }))
</script>

<template>
  <div
    v-if="count > 0"
    class="flex items-center gap-3.5"
  >
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
  none: Δεν υπάρχουν ακόμα αξιολογήσεις. Γράψε την πρώτη.
en:
  rated: Rated {n} out of 5
  based_on: "Based on {count} review | Based on {count} reviews"
  none: No reviews yet. Be the first to write one.
</i18n>
