<script lang="ts" setup>
/**
 * The shopper's reviews, as the boards draw them: one row per review
 * with the product, the stars, where moderation stands and the comment,
 * and a way to edit it. No "write a review" prompts: Django has no list
 * of products waiting for one (PLAN B46).
 *
 * Editing opens the product page's own review sheet, with the review as
 * that page fetches it (`user-product-review`, the detail shape the sheet
 * takes) — one sheet for writing, editing and deleting everywhere; a
 * delete asks there before it happens. Newest or oldest first, and the
 * list pages through the URL.
 */
const { t, locale } = useI18n()
useHead({ title: () => t('title') })
const route = useRoute()
const localePath = useLocalePath()
const toast = useToast()
const { user } = useUserSession()
const { productUrl } = useUrls()

const PAGE_SIZE = 10
const page = computed(() => Math.max(1, Number(route.query.page) || 1))

const ORDERINGS = { newest: '-createdAt', oldest: 'createdAt' } as const
const ordering = computed(() => Object.values(ORDERINGS).find(value => value === route.query.ordering) ?? ORDERINGS.newest)
const orderingItems = computed(() => Object.entries(ORDERINGS).map(([key, value]) => ({ value, label: t(`ordering.${key}`) })))
const orderingModel = computed({
  get: () => ordering.value,
  set: value => navigateTo({ query: { ...route.query, ordering: value === ORDERINGS.newest ? undefined : value, page: undefined } }),
})

const { data: reviews, status, refresh } = await useApi(`/api/user/account/${user.value?.id}/product-reviews`, {
  key: `account-reviews-${user.value?.id}`,
  method: 'GET',
  query: { page, pageSize: PAGE_SIZE, ordering },
})

// The brief product carries its name already in the page's language
// (Django answers in the `X-Language` it is sent).
const productName = (review: ProductReview) => review.product.name ?? ''

const editing = ref<ProductReviewDetail | null>(null)
const editOpen = ref(false)
const loadingEdit = ref<number | null>(null)

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

async function onChanged() {
  editOpen.value = false
  await refresh()
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <AccountPageHeader :title="t('title')">
      <template
        v-if="reviews?.count"
        #actions
      >
        <USelect
          v-model="orderingModel"
          :items="orderingItems"
          :aria-label="t('ordering.label')"
          size="lg"
          class="min-h-11 w-full sm:w-48"
        />
      </template>
    </AccountPageHeader>

    <div
      v-if="status === 'pending' && !reviews"
      class="flex flex-col gap-3"
      aria-hidden="true"
    >
      <USkeleton
        v-for="index in 3"
        :key="index"
        class="h-24 w-full rounded-md"
      />
    </div>

    <AccountLoadError
      v-else-if="status === 'error'"
      :message="t('list_error')"
      @retry="() => refresh()"
    />

    <ul
      v-else-if="reviews?.results.length"
      class="flex flex-col gap-3"
    >
      <li
        v-for="review in reviews.results"
        :key="review.id"
        class="flex gap-3 rounded-md bg-default p-4 ring ring-default sm:gap-4 sm:p-5"
      >
        <span class="size-14 shrink-0 overflow-hidden rounded-sm bg-elevated">
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
            <ProductReviewsStars :rate="review.rate" />
            <ProductReviewsStatusBadge :status="review.status" />
          </div>
          <p class="wrap-anywhere text-sm text-toned">
            {{ extractTranslated(review, 'comment', locale) }}
          </p>
        </div>
        <UButton
          :aria-label="t('edit_named', { name: productName(review) })"
          :loading="loadingEdit === review.id"
          icon="i-lucide-pencil"
          color="neutral"
          variant="outline"
          square
          class="size-11 shrink-0 self-start"
          @click="() => edit(review)"
        />
      </li>
    </ul>

    <div
      v-else
      class="flex flex-col items-start gap-2 rounded-md bg-default p-6 ring ring-default"
    >
      <p class="font-semibold text-highlighted">
        {{ t('empty.title') }}
      </p>
      <p class="text-toned">
        {{ t('empty.description') }}
      </p>
      <UButton
        :label="t('empty.browse')"
        :to="localePath('products')"
        color="neutral"
        variant="outline"
        class="mt-2 min-h-11"
      />
    </div>

    <UPagination
      v-if="reviews && reviews.count > PAGE_SIZE"
      :page="page"
      :total="reviews.count"
      :items-per-page="PAGE_SIZE"
      :to="(target: number) => ({ query: { ...route.query, page: target > 1 ? target : undefined } })"
      class="self-center"
    />

    <LazyProductReview
      v-if="editing"
      v-model:open="editOpen"
      :user-product-review="editing"
      :user-had-reviewed="true"
      :product="editing.product"
      :product-name="extractTranslated(editing.product, 'name', locale) ?? ''"
      @update-existing-review="onChanged"
      @delete-existing-review="onChanged"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  title: Οι κριτικές μου
  list_error: Οι κριτικές σου δεν φορτώθηκαν.
  edit_named: Επεξεργασία της κριτικής για «{name}»
  load_error: Η κριτική δεν άνοιξε για επεξεργασία
  ordering:
    label: Ταξινόμηση κριτικών
    newest: Πρώτες οι πιο πρόσφατες
    oldest: Πρώτες οι παλαιότερες
  empty:
    title: Καμία κριτική ακόμα
    description: Όταν γράψεις κριτική για ένα προϊόν που έχεις αγοράσει, θα τη βρίσκεις εδώ.
    browse: Δες τα προϊόντα
en:
  title: My reviews
  list_error: Your reviews did not load.
  edit_named: Edit your review of “{name}”
  load_error: The review did not open for editing
  ordering:
    label: Sort reviews
    newest: Newest first
    oldest: Oldest first
  empty:
    title: No reviews yet
    description: When you review a product you have bought, you will find it here.
    browse: Browse products
</i18n>
