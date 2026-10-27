<script lang="ts" setup>
/**
 * A rating drawn as five solid stars in half steps: the one read-only
 * star row of every review surface (the summary, a review, the product
 * cards, "My reviews").
 *
 * `rate` is the model's 1..10 scale and may be fractional (an average);
 * the stars are the five a reader counts, the rate rounded to the nearest
 * half star. The row is one image to a screen reader ("Rated 4.5 out of
 * 5"), never five stars. The empty stars take the border token and the
 * filled ones the `--ui-rating` amber, so the row reads the same in every
 * theme and scheme.
 *
 * Drawn with plain elements, not `UInputRating`: that is an input (a
 * radio group of ten items per row), about 190 components for a row
 * nobody can change, and a review list mounts one per review.
 */
const props = withDefaults(defineProps<{
  rate: number
  /** `card` is the 14 px row of the product cards. */
  size?: 'xs' | 'card' | 'sm'
}>(), {
  size: 'xs',
})

const { t, n } = useI18n()

const STAR_COUNT = 5
const STAR_ICON = 'i-heroicons-star-solid'
const STAR_SIZE = { xs: 'size-3', card: 'size-3.5', sm: 'size-4' } as const

const outOfFive = computed(() => props.rate / 2)
const label = computed(() => t('rated', { n: n(outOfFive.value, { maximumFractionDigits: 1 }) }))

/** Each star's filled share: 1, 0.5 or 0. */
const fills = computed(() => {
  const halves = Math.round(outOfFive.value * 2)
  return Array.from({ length: STAR_COUNT }, (_, index) => Math.min(Math.max(halves - index * 2, 0), 2) / 2)
})
</script>

<template>
  <span
    role="img"
    :aria-label="label"
    class="inline-flex"
  >
    <span
      aria-hidden="true"
      class="inline-flex items-center gap-0.5"
    >
      <span
        v-for="(fill, index) in fills"
        :key="index"
        class="relative inline-block"
        :class="STAR_SIZE[size]"
      >
        <UIcon
          v-if="fill < 1"
          :name="STAR_ICON"
          class="block size-full text-(--ui-border-accented)"
        />
        <span
          v-if="fill > 0"
          class="absolute inset-0 overflow-hidden"
          :class="fill < 1 ? 'w-1/2' : 'w-full'"
        >
          <UIcon
            :name="STAR_ICON"
            class="block text-(--ui-rating)"
            :class="STAR_SIZE[size]"
          />
        </span>
      </span>
    </span>
  </span>
</template>

<i18n lang="yaml">
el:
  rated: Βαθμολογία {n} στα 5
en:
  rated: Rated {n} out of 5
</i18n>
