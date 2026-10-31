<script lang="ts" setup>
/**
 * A product's rating where it is quoted rather than read: under a card's
 * name ("4.3 · 12") and beside the product page's title, where `href`
 * makes it the link to the reviews.
 *
 * `average` is the model's 1..10 scale, shown as the five stars a reader
 * counts, never "8.6/10". Nothing is drawn for a product nobody has
 * reviewed, so a card without reviews keeps no empty row.
 */
const props = withDefaults(defineProps<{
  average?: number | null
  count?: number | null
  /** Names the count ("12 reviews") instead of the bare "12". */
  verbose?: boolean
  href?: string
}>(), {
  average: null,
  count: null,
  verbose: false,
  href: undefined,
})

const { t, n } = useStoreI18n('components/Product/Rating')

const reviews = computed(() => props.count ?? 0)
const figure = computed(() => n((props.average ?? 0) / 2, { minimumFractionDigits: 1, maximumFractionDigits: 1 }))
const label = computed(() => t('rated_by', { n: figure.value, count: reviews.value }, reviews.value))
</script>

<template>
  <!-- Quoted, it is one image named whole. As the link to the reviews it
       is named by its text, so the name holds what is on screen (WCAG
       2.5.3) and "out of 5" follows as text only a screen reader gets. -->
  <component
    :is="href ? 'a' : 'div'"
    v-if="reviews > 0"
    :href="href"
    :role="href ? undefined : 'img'"
    :aria-label="href ? undefined : label"
    class="flex items-center gap-1.5"
    :class="href ? 'self-start' : undefined"
  >
    <ProductReviewsStars
      :rate="average ?? 0"
      size="card"
      aria-hidden="true"
    />
    <span
      :aria-hidden="href ? undefined : 'true'"
      class="text-[0.8125rem] font-semibold text-muted"
      :class="href ? 'underline-offset-2 hover:underline' : undefined"
    >
      {{ figure }} · {{ verbose ? t('n_reviews', { count: reviews }, reviews) : reviews }}
    </span>
    <span
      v-if="href"
      class="sr-only"
    >, {{ t('out_of_five') }}</span>
  </component>
</template>

<i18n lang="yaml">
el:
  rated_by: "Βαθμολογία {n} στα 5, από {count} αξιολόγηση | Βαθμολογία {n} στα 5, από {count} αξιολογήσεις"
  n_reviews: "{count} αξιολόγηση | {count} αξιολογήσεις"
  out_of_five: βαθμολογία στα 5
en:
  rated_by: "Rated {n} out of 5, from {count} review | Rated {n} out of 5, from {count} reviews"
  n_reviews: "{count} review | {count} reviews"
  out_of_five: rated out of 5
</i18n>
