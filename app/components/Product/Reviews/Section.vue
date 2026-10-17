<script lang="ts" setup>
/**
 * The reviews of a product page, whatever store draws it: the summary
 * and the way to write one on one side, the reviews on the other, side
 * by side once the section itself is wide enough (a container query, so
 * it fits a full-width band and a narrower column alike) and stacked
 * below that.
 *
 * `id="reviews"` is what the rating beside the product's title links to;
 * `scroll-mt-24` keeps the heading clear of the sticky header.
 *
 * A signed-in shopper writes (or edits) in the review sheet, mounted on
 * first use; a guest is sent to sign in and brought back here. The
 * parent owns the first page of reviews (it feeds Schema.org) and
 * refreshes it, and the product's average, when `changed` fires.
 */
const props = defineProps<{
  /** What the section reads of the product page's: the summary's figures and which product a review is of. */
  product: Pick<ProductRetrieve, 'id' | 'mainImagePath' | 'reviewAverage' | 'reviewCount' | 'ratingDistribution'>
  productName: string
  firstPage: ListProductReviewsResponse | null | undefined
}>()

const emit = defineEmits<{
  changed: []
}>()

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { user, loggedIn } = useUserSession()
const reviewsEnabled = useSettingFlag('PRODUCT_REVIEWS_ENABLED', { fallback: true })

const headingId = useId()

// User-specific data: client-side only.
const { data: userProductReview, status: reviewStatus, refresh: refreshUserProductReview }
  = useLazyApi<GetUserProductReviewResponse>(`/api/products/reviews/${props.product.id}/user-product-review`, {
    key: `productReviews${props.product.id}${user.value?.id}`,
    method: 'GET',
    // A store with reviews off has no review of the shopper to show.
    enabled: () => loggedIn.value && reviewsEnabled.value,
    server: false,
  })

// `enabled` only blocks a request, it never starts one: a product page is
// served from a cache that knows no shopper, so the session can arrive after
// setup, and the review the shopper wrote must be fetched then.
watch(loggedIn, (signedIn) => {
  if (signedIn) void refreshUserProductReview()
  else userProductReview.value = undefined
})

const userHadReviewed = computed(() => !!userProductReview.value)

const sheetMounted = ref(false)
const sheetOpen = ref(false)

function openSheet() {
  sheetMounted.value = true
  sheetOpen.value = true
}

async function onReviewChanged() {
  await refreshUserProductReview()
  emit('changed')
}

/** A guest is sent to sign in, and brought back to the reviews. */
const signInToReview = computed(() =>
  localePath({ name: RedirectToURLs.LOGIN_URL, query: { next: `${route.fullPath.split('#')[0]}#reviews` } }),
)
</script>

<template>
  <section
    id="reviews"
    :aria-labelledby="headingId"
    class="@container scroll-mt-24"
  >
    <div
      class="
        grid gap-6
        @3xl:grid-cols-[20rem_1fr] @3xl:gap-16
      "
    >
      <div class="flex flex-col items-start gap-4">
        <h2
          :id="headingId"
          class="
            font-display text-[1.625rem] font-bold tracking-[-0.02em]
            text-highlighted
            @3xl:text-[2rem]
          "
        >
          {{ t('title') }}
        </h2>
        <ProductReviewsOverview
          :average="product.reviewAverage"
          :count="product.reviewCount"
          :distribution="product.ratingDistribution"
        />
        <UButton
          v-if="loggedIn"
          :label="userHadReviewed ? t('update_review') : t('write_review')"
          :loading="reviewStatus === 'pending'"
          color="secondary"
          icon="i-lucide-pen-line"
          class="mt-1.5 min-h-11"
          @click="openSheet"
        />
        <UButton
          v-else
          :label="t('sign_in_to_write')"
          color="secondary"
          icon="i-lucide-pen-line"
          :to="signInToReview"
          class="mt-1.5 min-h-11"
        />
      </div>

      <ProductReviewsList
        v-if="product.reviewCount > 0"
        :product-id="product.id"
        :first-page="firstPage"
      />
    </div>

    <LazyProductReview
      v-if="loggedIn && sheetMounted"
      v-model:open="sheetOpen"
      :user-product-review="userProductReview"
      :user-had-reviewed="userHadReviewed"
      :product="product"
      :product-name="productName"
      @add-existing-review="onReviewChanged"
      @update-existing-review="onReviewChanged"
      @delete-existing-review="onReviewChanged"
    />
  </section>
</template>

<i18n lang="yaml">
el:
  title: Αξιολογήσεις
  write_review: Γράψε κριτική
  update_review: Ενημέρωση κριτικής
  sign_in_to_write: Συνδέσου για να γράψεις κριτική
en:
  title: Reviews
  write_review: Write a review
  update_review: Update your review
  sign_in_to_write: Sign in to write a review
</i18n>
