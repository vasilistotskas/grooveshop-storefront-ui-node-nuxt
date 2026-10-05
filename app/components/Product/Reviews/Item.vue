<script lang="ts" setup>
/**
 * One review on the product page: its stars, who wrote it and when,
 * and what they said.
 *
 * The reviewer is named by first name and initial, never in full: a
 * product page is public and the shopper wrote for the store, not for a
 * search index. The comment shows in the language it was written in
 * when the page's has none, marked with its `lang`.
 */
const props = defineProps<{
  review: ProductReview
}>()

const { t, n, locale } = useI18n()
const tenantStore = useTenantStore()

const author = computed(() => reviewerName(props.review.user) ?? t('anonymous'))
const outOfFive = computed(() => props.review.rate / 2)
const comment = computed(() =>
  resolveTranslated(props.review, 'comment', locale.value, [tenantStore.defaultLocale]),
)
</script>

<template>
  <article class="flex flex-col gap-2.5 border-b border-default py-5.5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2.5">
        <UInputRating
          :model-value="outOfFive"
          :step="0.5"
          size="xs"
          color="primary"
          icon="i-heroicons-star-solid"
          :ui="{ emptyIcon: 'text-(--ui-border-accented)' }"
          readonly
          :aria-label="t('rated', { n: n(outOfFive, { maximumFractionDigits: 1 }) })"
        />
        <strong class="text-sm text-highlighted">{{ author }}</strong>
        <UBadge
          v-if="review.isVerifiedPurchase"
          :label="t('verified')"
          icon="i-lucide-check"
          color="success"
          variant="subtle"
          size="sm"
        />
      </div>
      <NuxtTime
        :datetime="review.publishedAt ?? review.createdAt"
        :locale="locale"
        relative
        numeric="auto"
        class="text-[0.8125rem] text-muted"
      />
    </div>
    <p
      v-if="comment"
      class="text-muted"
      :lang="comment.locale === locale ? undefined : comment.locale"
    >
      {{ comment.value }}
    </p>
  </article>
</template>

<i18n lang="yaml">
el:
  anonymous: Ανώνυμος πελάτης
  rated: Βαθμολογία {n} στα 5
  verified: Επαληθευμένη αγορά
en:
  anonymous: Anonymous shopper
  rated: Rated {n} out of 5
  verified: Verified purchase
</i18n>
