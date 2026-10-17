<script lang="ts" setup>
/**
 * A product's reviews as the product page reads them: three at first,
 * then every review of the first page, then a page more per click, in
 * the order the reader picks (newest, highest, lowest).
 *
 * The first page, in the default order, is the page's own: it is fetched
 * on the server because it also feeds Schema.org. Another order and
 * later pages are fetched here, on demand, and a new `firstPage` (the
 * page refreshed after a review changed) starts the list over.
 */
const props = defineProps<{
  productId: number
  firstPage: ListProductReviewsResponse | null | undefined
}>()

const { t } = useI18n()

/** Reviews shown before "show all". */
const PREVIEW_COUNT = 3

const sort = ref<ReviewSort>(DEFAULT_REVIEW_SORT)
const expanded = ref(false)
/** The first page of a non-default order; the default order reads `firstPage`. */
const sortedFirst = ref<ListProductReviewsResponse | null>(null)
const laterPages = ref<ProductReview[][]>([])
const loading = ref(false)
const failed = ref(false)

const first = computed(() => sort.value === DEFAULT_REVIEW_SORT ? props.firstPage : sortedFirst.value)
const loaded = computed(() => [...(first.value?.results ?? []), ...laterPages.value.flat()])
const total = computed(() => first.value?.count ?? 0)
const visible = computed(() => expanded.value ? loaded.value : loaded.value.slice(0, PREVIEW_COUNT))
const hasMore = computed(() => total.value > visible.value.length)

/** The pick shows once there is more than one review to order. */
const sortable = computed(() => (props.firstPage?.count ?? 0) > 1)
const sortItems = computed(() => REVIEW_SORT_KEYS.map(value => ({ value, label: t(`sort.${value}`) })))

function fetchPage(page: number) {
  return $api<ListProductReviewsResponse>(`/api/products/${props.productId}/reviews`, {
    query: { ordering: REVIEW_SORTS[sort.value], page },
  })
}

/** Runs one request with the list's loading and error states around it. */
async function load(request: () => Promise<void>) {
  if (loading.value) return
  loading.value = true
  failed.value = false
  try {
    await request()
  }
  catch (error) {
    log.error({ action: 'reviews:load', error })
    failed.value = true
  }
  finally {
    loading.value = false
  }
}

const loadFirstOfSort = () => load(async () => {
  sortedFirst.value = await fetchPage(1)
})

const loadNextPage = () => load(async () => {
  const page = await fetchPage(laterPages.value.length + 2)
  laterPages.value = [...laterPages.value, page.results ?? []]
})

async function showMore() {
  if (!expanded.value) {
    expanded.value = true
    if (loaded.value.length > PREVIEW_COUNT) return
  }
  await loadNextPage()
}

const retry = () => sort.value !== DEFAULT_REVIEW_SORT && !sortedFirst.value ? loadFirstOfSort() : loadNextPage()

function restart() {
  laterPages.value = []
  sortedFirst.value = null
  failed.value = false
  if (sort.value !== DEFAULT_REVIEW_SORT) void loadFirstOfSort()
}

watch(sort, restart)
watch(() => props.firstPage, restart)
</script>

<template>
  <div class="flex flex-col gap-2">
    <USelect
      v-if="sortable"
      v-model="sort"
      :items="sortItems"
      :aria-label="t('sort.label')"
      size="lg"
      class="min-h-11 w-full self-end sm:w-56"
    />

    <div
      v-if="loading && !visible.length"
      class="flex flex-col gap-4 py-5.5"
      aria-hidden="true"
    >
      <USkeleton
        v-for="index in PREVIEW_COUNT"
        :key="index"
        class="h-20 w-full"
      />
    </div>

    <div
      v-else
      :aria-busy="loading"
      class="flex flex-col"
    >
      <ProductReviewsItem
        v-for="review in visible"
        :key="review.id"
        :review="review"
      />
    </div>

    <div
      v-if="failed"
      role="alert"
      class="flex flex-wrap items-center justify-between gap-3 rounded-md bg-error/10 p-4 text-sm text-highlighted"
    >
      <span>{{ t('error') }}</span>
      <UButton
        :label="t('retry')"
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="outline"
        class="min-h-11"
        @click="retry"
      />
    </div>

    <UButton
      v-if="hasMore && !failed"
      :label="expanded ? t('more') : t('all', { count: total }, total)"
      color="neutral"
      variant="outline"
      :loading="loading"
      class="min-h-11 justify-center self-stretch sm:self-start"
      @click="showMore"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  all: "Δες την αξιολόγηση | Δες και τις {count} αξιολογήσεις"
  more: Περισσότερες αξιολογήσεις
  error: Οι αξιολογήσεις δεν φορτώθηκαν.
  retry: Δοκίμασε ξανά
  sort:
    label: Ταξινόμηση αξιολογήσεων
    newest: Πιο πρόσφατες
    highest: Υψηλότερη βαθμολογία
    lowest: Χαμηλότερη βαθμολογία
en:
  all: "Show the review | Show all {count} reviews"
  more: More reviews
  error: The reviews could not be loaded.
  retry: Try again
  sort:
    label: Sort reviews
    newest: Newest
    highest: Highest rated
    lowest: Lowest rated
</i18n>
