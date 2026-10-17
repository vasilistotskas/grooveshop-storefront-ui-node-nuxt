<script lang="ts" setup>
/**
 * A rating drawn as five solid stars in half steps: the one read-only
 * star row of every review surface (the summary, a review, the product
 * cards, "My reviews").
 *
 * `rate` is the model's 1..10 scale and may be fractional (an average);
 * the stars are the five a reader counts. The row is one image to a
 * screen reader ("Rated 4.5 out of 5"), never five stars. The empty
 * stars take the border token and the filled ones the `--ui-rating` amber,
 * so the row reads the same in every theme and scheme.
 */
const props = withDefaults(defineProps<{
  rate: number
  /** `card` is the 14 px row of the product cards. */
  size?: 'xs' | 'card' | 'sm'
}>(), {
  size: 'xs',
})

const { t, n } = useI18n()

const FILLED = 'data-[state=active]:text-(--ui-rating)'
const STARS_UI = {
  xs: { indicator: FILLED, emptyIcon: 'text-(--ui-border-accented)' },
  card: { item: 'size-3.5', icon: 'size-3.5', indicator: FILLED, emptyIcon: 'text-(--ui-border-accented)' },
  sm: { indicator: FILLED, emptyIcon: 'text-(--ui-border-accented)' },
} as const

const outOfFive = computed(() => props.rate / 2)
const label = computed(() => t('rated', { n: n(outOfFive.value, { maximumFractionDigits: 1 }) }))
</script>

<template>
  <span
    role="img"
    :aria-label="label"
    class="inline-flex"
  >
    <UInputRating
      :model-value="outOfFive"
      :step="0.5"
      :size="size === 'sm' ? 'sm' : 'xs'"
      color="primary"
      icon="i-heroicons-star-solid"
      :ui="STARS_UI[size]"
      readonly
      aria-hidden="true"
    />
  </span>
</template>

<i18n lang="yaml">
el:
  rated: Βαθμολογία {n} στα 5
en:
  rated: Rated {n} out of 5
</i18n>
