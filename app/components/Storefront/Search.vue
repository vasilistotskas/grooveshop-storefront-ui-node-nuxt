<script lang="ts" setup>
/**
 * The search page: one big field, what others search for under it, then
 * the products found — with the guides that match beside them — or the
 * guides alone on their own tab.
 *
 * The URL is the state (`?query=`, `?tab=guides`, `?page=`), so a search
 * can be shared, reloaded and walked back. Products and guides are two
 * searches, each paged on its own (`/api/products/search`,
 * `/api/search/blog-posts`): one request for both made the guides follow
 * whatever page of products was open.
 */
const { t, locale } = useI18n()
const route = useRoute(`search___${locale.value}`)
const { trackResultClick } = useSearchClickTracking()

/** How many guides sit beside the products. */
const ASIDE_GUIDES = 3

type Tab = 'products' | 'guides'

const firstOf = (value: unknown): string =>
  typeof value === 'string' ? value : Array.isArray(value) && typeof value[0] === 'string' ? value[0] : ''

const query = computed(() => firstOf(route.query.query).trim())
const tab = computed<Tab>(() => route.query.tab === 'guides' ? 'guides' : 'products')
const page = computed(() => Math.max(1, Number(firstOf(route.query.page)) || 1))
const limit = ref(12)
const offset = computed(() => (page.value - 1) * limit.value)

/** The URL for a state change; `page` drops back to the first unless given. */
function stateQuery(change: { query?: string, tab?: Tab, page?: number }) {
  const next = { query: change.query ?? query.value, tab: change.tab ?? tab.value, page: change.page ?? 1 }
  return {
    ...(next.query ? { query: next.query } : {}),
    ...(next.tab === 'guides' ? { tab: 'guides' } : {}),
    ...(next.page > 1 ? { page: String(next.page) } : {}),
  }
}

// The field types freely; the URL — and the searches — follow a beat
// later, replacing the entry rather than stacking one per keystroke.
const draft = ref(query.value)
watch(query, (value) => {
  if (value !== draft.value.trim()) draft.value = value
})
const commitDraft = useDebounceFn(() => {
  if (draft.value.trim() === query.value) return
  navigateTo({ query: stateQuery({ query: draft.value.trim() }) }, { replace: true })
}, 300)

function search(value: string) {
  draft.value = value
  navigateTo({ query: stateQuery({ query: value }) })
}

const hasQuery = computed(() => query.value.length > 0)

// Each search runs only with something to search for: an empty query
// would list the whole catalogue. Both run on either tab, for the
// counts on the tabs; the open tab's search is the one that pages.
const productsOffset = computed(() => tab.value === 'products' ? offset.value : 0)
const {
  data: products,
  status: productsStatus,
  refresh: refreshProducts,
} = await useApi<ProductMeiliSearchResponse>('/api/products/search', {
  query: { query, languageCode: locale, limit, offset: productsOffset, facets: 'category' },
  immediate: hasQuery.value,
  watch: false,
})

const guidesLimit = computed(() => tab.value === 'guides' ? limit.value : ASIDE_GUIDES)
const guidesOffset = computed(() => tab.value === 'guides' ? offset.value : 0)
const {
  data: guides,
  status: guidesStatus,
  refresh: refreshGuides,
} = await useApi<BlogPostMeiliSearchResponse>('/api/search/blog-posts', {
  query: { query, languageCode: locale, limit: guidesLimit, offset: guidesOffset },
  immediate: hasQuery.value,
  watch: false,
})

watch([query, locale, limit, productsOffset], () => {
  if (hasQuery.value) refreshProducts()
})
watch([query, locale, guidesLimit, guidesOffset], () => {
  if (hasQuery.value) refreshGuides()
})

const trending = useLazyApi<TrendingSearchResponse>('/api/search/trending', {
  query: { languageCode: locale, contentType: 'product', limit: 4 },
})
const trendingQueries = computed(() => (trending.data.value?.results ?? []).map(result => result.query))

const productCount = computed(() => products.value?.estimatedTotalHits ?? 0)
const guideCount = computed(() => guides.value?.estimatedTotalHits ?? 0)
const openCount = computed(() => tab.value === 'guides' ? guideCount.value : productCount.value)
const pending = computed(() => (tab.value === 'guides' ? guidesStatus : productsStatus).value === 'pending')
// The engine widened the query when nothing matched it: say so, the
// results are not the ones that were asked for.
const relaxedQuery = computed(() => (tab.value === 'guides' ? guides : products).value?.relaxedQuery ?? null)

const tabItems = computed(() => [
  { value: 'products', label: t('tabs.products'), badge: productCount.value },
  { value: 'guides', label: t('tabs.guides'), badge: guideCount.value },
])

function selectTab(value: string | number) {
  navigateTo({ query: stateQuery({ tab: value === 'guides' ? 'guides' : 'products' }) })
}

const pageLink = (target: number) => ({ path: route.path, query: stateQuery({ page: target }) })

function changeLimit(value: unknown) {
  const next = Number(value)
  if (!Number.isFinite(next) || next <= 0) return
  limit.value = next
  navigateTo({ query: stateQuery({}) }, { replace: true })
}

const limitOptions = computed(() => [12, 24, 48].map(value => ({ label: t('per_page', { n: value }), value })))

function onProductClick(product: ProductMeiliSearchResult, index: number) {
  trackResultClick({
    queryId: products.value?.queryId,
    resultId: product.master,
    resultType: 'product',
    position: productsOffset.value + index,
  })
}

function onGuideClick(post: BlogPostMeiliSearchResult, index: number) {
  trackResultClick({
    queryId: guides.value?.queryId,
    resultId: post.master,
    resultType: 'blog_post',
    position: guidesOffset.value + index,
  })
}

// `/` from anywhere on the page puts the cursor in the field.
const field = useTemplateRef<{ inputRef: HTMLInputElement | null }>('field')
defineShortcuts({
  '/': () => field.value?.inputRef?.focus(),
})

useHead({
  title: () => query.value ? t('title_query', { query: query.value }) : t('title'),
})
</script>

<template>
  <UContainer class="flex flex-col pt-5 pb-12 lg:pt-10 lg:pb-22">
    <PageBreadcrumb :items="[{ label: t('title') }]" />
    <h1 class="sr-only">
      {{ query ? t('title_query', { query }) : t('title') }}
    </h1>

    <div class="mx-auto mt-5 w-full max-w-205 lg:mt-7">
      <UInput
        ref="field"
        v-model="draft"
        icon="i-heroicons-magnifying-glass"
        :placeholder="t('placeholder')"
        :aria-label="t('title')"
        autofocus
        class="w-full"
        :ui="{
          base: `
            h-13 rounded-full ps-12 text-base font-semibold
            lg:h-16 lg:ps-13 lg:text-[1.1875rem]
          `,
          leading: `
            ps-4.5
            lg:ps-5
          `,
          leadingIcon: `
            size-5
            lg:size-6
          `,
          trailing: 'gap-2 pe-2.5',
        }"
        @update:model-value="commitDraft"
      >
        <template #trailing>
          <UButton
            v-if="draft"
            icon="i-heroicons-x-mark"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('clear')"
            @click="() => search('')"
          />
          <UKbd
            value="/"
            class="hidden lg:inline-flex"
          />
        </template>
      </UInput>
    </div>

    <div
      v-if="trendingQueries.length"
      class="mt-4 flex flex-wrap items-center justify-center gap-2"
    >
      <span class="text-[0.8125rem] font-semibold text-muted">{{ t('trending') }}</span>
      <UButton
        v-for="term in trendingQueries"
        :key="term"
        :to="{ path: route.path, query: stateQuery({ query: term }) }"
        color="neutral"
        variant="outline"
        size="xs"
        :label="term"
        class="text-[0.8125rem]"
      />
    </div>

    <template v-if="hasQuery">
      <div
        class="
          mt-8 flex items-end justify-between gap-4 border-b border-default
          lg:mt-11
        "
      >
        <UTabs
          :model-value="tab"
          :items="tabItems"
          :content="false"
          variant="link"
          color="neutral"
          :ui="{ list: 'gap-6 border-0',
                 trigger: `px-1 pb-3 text-[0.9375rem] font-semibold`,
                 indicator: `h-0.5` }"
          @update:model-value="selectTab"
        >
          <template #trailing="{ item }">
            <UBadge
              :label="String(item.badge)"
              :color="item.value === tab ? 'primary' : 'neutral'"
              :variant="item.value === tab ? 'solid' : 'soft'"
              size="sm"
            />
          </template>
        </UTabs>

        <div class="hidden items-center gap-2 pb-2 lg:flex">
          <p class="text-sm text-muted">
            <i18n-t
              keypath="results"
              :plural="openCount"
            >
              <template #count>
                {{ openCount }}
              </template>
              <template #query>
                <strong class="text-highlighted">“{{ query }}”</strong>
              </template>
            </i18n-t>
          </p>
          <USelect
            :model-value="limit"
            :items="limitOptions"
            value-key="value"
            :aria-label="t('per_page_label')"
            :ui="{ base: 'h-9 rounded-full ps-3.5 font-semibold ring-default' }"
            @update:model-value="changeLimit"
          />
        </div>
      </div>

      <div
        v-if="openCount"
        role="status"
        class="
          mt-5 hidden gap-3 rounded-[0.875rem] bg-(--ui-info-soft) px-4 py-3.5
          text-info
          lg:flex
        "
      >
        <UIcon
          name="i-heroicons-sparkles"
          class="mt-0.5 size-5 shrink-0"
        />
        <div class="flex flex-col gap-0.5 text-sm">
          <strong>{{ relaxedQuery ? t('relaxed', { query: relaxedQuery }) : t('forgiving.title') }}</strong>
          <span class="text-toned">{{ t('forgiving.body') }}</span>
        </div>
      </div>

      <div
        v-if="pending && !openCount"
        class="mt-6 grid grid-cols-2 gap-3.5 lg:grid-cols-3 lg:gap-6"
      >
        <ProductCardSkeleton
          v-for="i in 6"
          :key="i"
        />
      </div>

      <UEmpty
        v-else-if="!openCount"
        icon="i-heroicons-magnifying-glass-minus"
        :title="t('empty.title')"
        :description="t('empty.description', { query })"
        class="mt-10"
      />

      <div
        v-else-if="tab === 'products'"
        class="
          mt-6 grid gap-10
          lg:grid-cols-[minmax(0,1fr)_21.25rem]
        "
      >
        <div class="flex flex-col gap-10">
          <ol class="grid grid-cols-2 gap-3.5 lg:grid-cols-3 lg:gap-6">
            <ProductCard
              v-for="(product, index) in products?.results ?? []"
              :key="product.id"
              :product="product as unknown as Product"
              :img-loading="index > 5 ? 'lazy' : 'eager'"
              @click.capture="onProductClick(product, index)"
            />
          </ol>
          <ProductsPagination
            v-if="productCount > limit"
            :page="page"
            :total="productCount"
            :items-per-page="limit"
            :to="pageLink"
          />
        </div>

        <aside
          v-if="guides?.results.length"
          class="hidden flex-col gap-3 lg:flex"
          :aria-labelledby="'search-guides-heading'"
        >
          <h2
            id="search-guides-heading"
            class="text-[0.9375rem] font-extrabold text-highlighted"
          >
            {{ t('from_guides') }}
          </h2>
          <SearchGuideCard
            v-for="(post, index) in guides.results"
            :key="post.id"
            :post="post"
            @click="onGuideClick(post, index)"
          />
        </aside>
      </div>

      <div
        v-else
        class="mt-6 flex flex-col gap-10"
      >
        <ul class="grid gap-3 lg:grid-cols-2">
          <li
            v-for="(post, index) in guides?.results ?? []"
            :key="post.id"
          >
            <SearchGuideCard
              :post="post"
              @click="onGuideClick(post, index)"
            />
          </li>
        </ul>
        <ProductsPagination
          v-if="guideCount > limit"
          :page="page"
          :total="guideCount"
          :items-per-page="limit"
          :to="pageLink"
        />
      </div>
    </template>

    <UEmpty
      v-else
      icon="i-heroicons-magnifying-glass"
      :title="t('start.title')"
      :description="t('start.description')"
      class="mt-12"
    />
  </UContainer>
</template>

<i18n lang="yaml">
el:
  title: Αναζήτηση
  title_query: "Αναζήτηση: {query}"
  placeholder: Τι ψάχνεις;
  clear: Καθαρισμός αναζήτησης
  trending: "Δημοφιλή:"
  tabs:
    products: Προϊόντα
    guides: Οδηγοί
  results: "{count} αποτέλεσμα για {query} | {count} αποτελέσματα για {query}"
  per_page: "{n} ανά σελίδα"
  per_page_label: Αποτελέσματα ανά σελίδα
  relaxed: "Δεν βρήκαμε κάτι ακριβώς γι' αυτό — δείχνουμε αποτελέσματα για «{query}»"
  forgiving:
    title: Βρίσκουμε ό,τι ψάχνεις, όπως κι αν το γράψεις
    body: Τα greeklish και τα ορθογραφικά λάθη αναγνωρίζονται αυτόματα.
  from_guides: Από τους οδηγούς
  empty:
    title: Δεν βρέθηκαν αποτελέσματα
    description: "Τίποτα για «{query}». Δοκίμασε μια πιο γενική λέξη ή ένα από τα δημοφιλή."
  start:
    title: Ξεκίνα την αναζήτηση
    description: Γράψε το όνομα ενός προϊόντος, μιας μάρκας ή ενός θέματος.
en:
  title: Search
  title_query: "Search: {query}"
  placeholder: What are you looking for?
  clear: Clear the search
  trending: "Trending:"
  tabs:
    products: Products
    guides: Guides
  results: "{count} result for {query} | {count} results for {query}"
  per_page: "{n} per page"
  per_page_label: Results per page
  relaxed: "Nothing matched exactly — showing results for “{query}”"
  forgiving:
    title: We find what you mean, however you type it
    body: Greeklish and typos are understood automatically.
  from_guides: From the guides
  empty:
    title: No results found
    description: "Nothing for “{query}”. Try a broader word or one of the trending searches."
  start:
    title: Start your search
    description: Type the name of a product, a brand or a topic.
</i18n>
