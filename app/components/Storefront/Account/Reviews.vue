<script lang="ts" setup>
/**
 * The shopper's reviews, as the boards draw them: one row per review
 * with the product, the stars, where moderation stands and the comment,
 * then Edit and delete. No "write a review" prompts: Django has no list
 * of products waiting for one (PLAN B46).
 *
 * Editing opens the product page's own review dialog, with the review
 * as that page fetches it (`user-product-review`, the detail shape the
 * dialog takes) — one dialog for writing and editing everywhere.
 */
const { t, n, locale } = useI18n()
useHead({ title: () => t('title') })
const route = useRoute()
const toast = useToast()
const { user } = useUserSession()
const { productUrl } = useUrls()

const PAGE_SIZE = 10
const page = computed(() => Math.max(1, Number(route.query.page) || 1))

const { data: reviews, status, refresh } = await useApi(`/api/user/account/${user.value?.id}/product-reviews`, {
  key: `account-reviews-${user.value?.id}`,
  method: 'GET',
  query: { page, pageSize: PAGE_SIZE, ordering: '-createdAt' },
})

const MODERATION: Record<ReviewStatus, { key: string, color: 'success' | 'warning' | 'error' }> = {
  TRUE: { key: 'status.published', color: 'success' },
  NEW: { key: 'status.in_review', color: 'warning' },
  FALSE: { key: 'status.rejected', color: 'error' },
}
const moderation = (review: ProductReview) => MODERATION[review.status ?? 'NEW']

// The brief product carries its name already in the page's language
// (Django answers in the `X-Language` it is sent).
const productName = (review: ProductReview) => review.product.name ?? ''

const editing = ref<ProductReviewDetail | null>(null)
const editOpen = ref(false)
const loadingEdit = ref<number | null>(null)
const deleting = ref<number | null>(null)

async function edit(review: ProductReview) {
  loadingEdit.value = review.id
  try {
    editing.value = await $api<ProductReviewDetail>(`/api/products/reviews/${review.product.id}/user-product-review`, {
      method: 'GET',
    })
    editOpen.value = true
  }
  catch (error) {
    log.error({ action: 'review:load', error })
    toast.add({ title: t('load_error'), color: 'error' })
  }
  finally {
    loadingEdit.value = null
  }
}

async function remove(review: ProductReview) {
  deleting.value = review.id
  try {
    await $api(`/api/products/reviews/${review.id}`, { method: 'DELETE' })
    toast.add({ title: t('deleted'), color: 'success' })
    await refresh()
  }
  catch (error) {
    log.error({ action: 'review:delete', error })
    toast.add({ title: t('delete_error'), color: 'error' })
  }
  finally {
    deleting.value = null
  }
}

async function onEdited() {
  editOpen.value = false
  await refresh()
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <AccountPageHeader :title="t('title')" />

    <div
      v-if="status === 'pending' && !reviews"
      class="flex flex-col gap-3"
    >
      <USkeleton
        v-for="index in 3"
        :key="index"
        class="h-24 w-full rounded-[1.25rem]"
      />
    </div>

    <ul
      v-else-if="reviews?.results.length"
      class="flex flex-col gap-3"
    >
      <li
        v-for="review in reviews.results"
        :key="review.id"
        class="flex gap-4 rounded-[1.25rem] bg-default p-5 ring ring-default"
      >
        <span class="size-14 shrink-0 overflow-hidden rounded-[0.875rem] bg-elevated">
          <ImgWithFallback
            :src="review.product.mainImagePath"
            alt=""
            :width="112"
            :height="112"
            fit="cover"
            loading="lazy"
            class="size-full object-cover"
          />
        </span>
        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
          <ULink
            :to="productUrl(review.product.id, review.product.slug)"
            class="font-semibold text-highlighted hover:underline"
          >
            {{ productName(review) }}
          </ULink>
          <div class="flex flex-wrap items-center gap-2">
            <UInputRating
              :model-value="review.rate / 2"
              :step="0.5"
              size="xs"
              color="primary"
              icon="i-heroicons-star-solid"
              :ui="{ emptyIcon: 'text-(--ui-border-accented)' }"
              readonly
              :aria-label="t('rated', { n: n(review.rate / 2, { maximumFractionDigits: 1 }) })"
            />
            <UBadge
              :label="t(moderation(review).key)"
              :color="moderation(review).color"
              variant="soft"
              size="sm"
            />
          </div>
          <p class="text-sm text-toned">
            {{ extractTranslated(review, 'comment', locale) }}
          </p>
        </div>
        <div class="flex shrink-0 items-start gap-1">
          <UButton
            :label="t('edit')"
            :aria-label="t('edit_named', { name: productName(review) })"
            :loading="loadingEdit === review.id"
            icon="i-lucide-pencil"
            color="neutral"
            variant="outline"
            size="sm"
            class="max-sm:hidden"
            @click="() => edit(review)"
          />
          <UButton
            :aria-label="t('edit_named', { name: productName(review) })"
            :loading="loadingEdit === review.id"
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="sm"
            class="sm:hidden"
            @click="() => edit(review)"
          />
          <UButton
            :aria-label="t('delete_named', { name: productName(review) })"
            :loading="deleting === review.id"
            icon="i-lucide-trash-2"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="() => remove(review)"
          />
        </div>
      </li>
    </ul>

    <div
      v-else
      class="flex flex-col gap-2 rounded-[1.25rem] bg-default p-6 ring ring-default"
    >
      <p class="font-semibold text-highlighted">
        {{ t('empty.title') }}
      </p>
      <p class="text-toned">
        {{ t('empty.description') }}
      </p>
    </div>

    <UPagination
      v-if="reviews && reviews.count > PAGE_SIZE"
      :page="page"
      :total="reviews.count"
      :items-per-page="PAGE_SIZE"
      :to="(target: number) => ({ query: { ...route.query, page: target > 1 ? target : undefined } })"
      class="self-center"
    />

    <ProductReview
      v-if="editing && user"
      v-model:open="editOpen"
      :user-product-review="editing"
      :user-had-reviewed="true"
      :product="editing.product"
      :product-name="extractTranslated(editing.product, 'name', locale) ?? ''"
      :user="user"
      @update-existing-review="onEdited"
      @delete-existing-review="onEdited"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  title: Οι κριτικές μου
  rated: Βαθμολογία {n} στα 5
  status:
    published: Δημοσιευμένη
    in_review: Σε έλεγχο
    rejected: Δεν δημοσιεύτηκε
  edit: Επεξεργασία
  edit_named: Επεξεργασία της κριτικής για «{name}»
  delete_named: Διαγραφή της κριτικής για «{name}»
  deleted: Η κριτική διαγράφηκε
  delete_error: Η κριτική δεν διαγράφηκε
  load_error: Η κριτική δεν άνοιξε για επεξεργασία
  empty:
    title: Καμία κριτική ακόμα
    description: Όταν γράψεις κριτική για ένα προϊόν, θα τη βρίσκεις εδώ.
en:
  title: My reviews
  rated: Rated {n} out of 5
  status:
    published: Published
    in_review: In review
    rejected: Not published
  edit: Edit
  edit_named: Edit your review of “{name}”
  delete_named: Delete your review of “{name}”
  deleted: Review deleted
  delete_error: The review could not be deleted
  load_error: The review did not open for editing
  empty:
    title: No reviews yet
    description: When you review a product, you will find it here.
</i18n>
