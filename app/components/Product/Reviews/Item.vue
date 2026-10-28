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

const { t, locale } = useStoreI18n('components/Product/Reviews/Item')
const tenantStore = useTenantStore()

/** A longer comment is cut to a few lines with a "Read more". */
const PREVIEW_CHARS = 280

const author = computed(() => reviewerName(props.review.user) ?? t('anonymous'))
const comment = computed(() =>
  resolveTranslated(props.review, 'comment', locale.value, [tenantStore.defaultLocale]),
)
const expanded = ref(false)
const collapsible = computed(() => (comment.value?.value.length ?? 0) > PREVIEW_CHARS)
const commentId = useId()
</script>

<template>
  <article class="flex flex-col gap-2.5 border-b border-default py-5.5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2.5">
        <ProductReviewsStars :rate="review.rate" />
        <strong class="text-sm text-highlighted">{{ author }}</strong>
        <UBadge
          v-if="review.isVerifiedPurchase"
          :label="t('verified')"
          icon="i-lucide-check"
          color="success"
          variant="subtle"
          :ui="{ base: 'text-toned', leadingIcon: 'text-success' }"
          size="sm"
        />
      </div>
      <NuxtTime
        :datetime="review.publishedAt ?? review.createdAt"
        :locale="locale"
        relative
        numeric="auto"
        class="text-[0.8125rem] text-toned"
      />
    </div>
    <template v-if="comment">
      <!-- `wrap-anywhere` breaks only a token wider than the card (a
           URL); `break-all` split every Greek word at the edge. -->
      <p
        :id="commentId"
        class="wrap-anywhere text-toned"
        :class="collapsible && !expanded ? 'line-clamp-4' : undefined"
        :lang="comment.locale === locale ? undefined : comment.locale"
      >
        {{ comment.value }}
      </p>
      <UButton
        v-if="collapsible"
        :label="expanded ? t('less') : t('more')"
        :aria-expanded="expanded"
        :aria-controls="commentId"
        color="neutral"
        variant="link"
        size="sm"
        class="min-h-11 self-start px-0"
        @click="() => { expanded = !expanded }"
      />
    </template>
  </article>
</template>

<i18n lang="yaml">
el:
  anonymous: Ανώνυμος πελάτης
  verified: Επαληθευμένη αγορά
  more: Διάβασε περισσότερα
  less: Διάβασε λιγότερα
en:
  anonymous: Anonymous shopper
  verified: Verified purchase
  more: Read more
  less: Read less
</i18n>
