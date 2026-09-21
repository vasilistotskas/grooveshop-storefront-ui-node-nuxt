<script lang="ts" setup>
const { t, locale } = useI18n()
const route = useRoute(`search___${locale.value}`)

const query = ref(
  Array.isArray(route.query.query)
    ? route.query.query[0] ?? ''
    : route.query.query ?? '',
)
const limit = ref(12)
const page = ref(1)
const activeTab = ref<'all' | 'products' | 'blogPosts'>('all')

const offset = computed(() => (page.value - 1) * limit.value)

// Two fetch lanes with genuinely different pagination semantics:
//
// - The per-type request drives the Products/Blog tabs (offset/limit
//   map 1:1 onto each type's own list) and always supplies the tab
//   badge counts.
// - The "All" tab uses the FEDERATED endpoint: one relevance-merged,
//   correctly paginated list. Concatenating the two per-type lists
//   here used to render up to 2x the page size, advertise phantom
//   trailing pages (summed totals over a single limit), and always
//   rank products above blog posts regardless of relevance.
const {
  data: searchResults,
  status,
} = await useFetch<SearchResponse>('/api/search', {
  key: computed(() => `search-${query.value}-${limit.value}-${offset.value}`),
  query: {
    query,
    languageCode: locale,
    limit,
    offset,
  },
  watch: [query, limit, offset],
})

const isAllTab = computed(() => activeTab.value === 'all')

const {
  data: federatedResults,
  status: federatedStatus,
} = await useFetch<FederatedSearchResponse>('/api/search/federated', {
  key: computed(
    () => `search-federated-${query.value}-${limit.value}-${offset.value}`,
  ),
  query: {
    query,
    languageCode: locale,
    limit,
    offset,
  },
  watch: [query, limit, offset],
  immediate: !!query.value,
})

const displayResults = computed<SearchResult[]>(() => {
  if (activeTab.value === 'products') {
    return searchResults.value?.products?.results || []
  }
  if (activeTab.value === 'blogPosts') {
    return searchResults.value?.blogPosts?.results || []
  }
  // Safe refinement: the backend always emits master/slug on enriched
  // federated hits (see EnrichedFederatedSearchResult).
  return (federatedResults.value?.results || []) as SearchResult[]
})

const totalResults = computed(() => {
  if (activeTab.value === 'products') {
    return searchResults.value?.products?.estimatedTotalHits || 0
  }
  if (activeTab.value === 'blogPosts') {
    return searchResults.value?.blogPosts?.estimatedTotalHits || 0
  }
  return federatedResults.value?.estimatedTotalHits || 0
})

const totalPages = computed(() => Math.ceil(totalResults.value / limit.value))

const isSearching = computed(() =>
  isAllTab.value
    ? federatedStatus.value === 'pending'
    : status.value === 'pending',
)

// The disclosure must describe the result set actually on screen —
// product and blog relaxation are computed independently backend-side.
const relaxedQuery = computed(() => {
  if (activeTab.value === 'products') {
    return searchResults.value?.products?.relaxedQuery ?? null
  }
  if (activeTab.value === 'blogPosts') {
    return searchResults.value?.blogPosts?.relaxedQuery ?? null
  }
  return federatedResults.value?.relaxedQuery ?? null
})

const { trackResultClick } = useSearchClickTracking()

function onResultClick(result: SearchResult, index: number) {
  // Federated hits type master as optional - without it the click
  // cannot be attributed to a rankable entity, so skip tracking.
  if (result.master == null) return
  const isProduct = result.contentType === 'product'
  trackResultClick({
    queryId: isAllTab.value
      ? federatedResults.value?.queryId
      : isProduct
        ? searchResults.value?.products?.queryId
        : searchResults.value?.blogPosts?.queryId,
    resultId: result.master,
    resultType: isProduct ? 'product' : 'blog_post',
    position: offset.value + index,
  })
}

const tabItems = computed(() => {
  const productsCount = searchResults.value?.products?.estimatedTotalHits || 0
  const blogPostsCount = searchResults.value?.blogPosts?.estimatedTotalHits || 0

  return [
    {
      value: 'all',
      label: t('page.tabs.all'),
      badge: productsCount + blogPostsCount,
    },
    {
      value: 'products',
      label: t('page.tabs.products_label'),
      badge: productsCount,
    },
    {
      value: 'blogPosts',
      label: t('page.tabs.blog_posts_label'),
      badge: blogPostsCount,
    },
  ]
})

watch([activeTab, query], () => {
  page.value = 1
})

watch(query, (newQuery) => {
  if (newQuery) {
    navigateTo({
      query: { query: newQuery },
    })
  }
  else {
    navigateTo({
      query: {},
    })
  }
})

const shortcuts = computed(() => [
  {
    key: '/',
    description: t('page.shortcuts.focus_search'),
  },
  {
    key: 'Escape',
    description: t('page.shortcuts.clear_search'),
  },
])

const inputRef = ref()

const handleKeydown = (e: KeyboardEvent) => {
  const activeEl = document.activeElement as HTMLElement | null
  const activeTag = activeEl?.tagName
  const isEditable = activeEl?.isContentEditable
  if (e.key === '/' && activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && !isEditable) {
    e.preventDefault()
    inputRef.value?.$el?.querySelector('input')?.focus()
  }
  if (e.key === 'Escape' && (activeTag === 'INPUT' || activeTag === 'TEXTAREA')) {
    query.value = ''
  }
}

useEventListener('keydown', handleKeydown)

onMounted(() => {
  if (inputRef.value) {
    inputRef.value.$el.querySelector('input')?.focus()
  }
})

useHead({
  title: computed(() =>
    query.value
      ? t('page.search_query', { query: query.value })
      : t('page.title'),
  ),
})
</script>

<template>
  <div class="flex min-h-[calc(100dvh-200px)] flex-col">
    <!-- The field is the page. It stays at the top of the band that
         carries it, above the counts and the tabs it drives. -->
    <PageSectionBand
      surface="muted"
      padding="sm"
    >
      <template #header>
        <div class="flex flex-col gap-5">
          <UBreadcrumb
            :items="[
              { label: t('page.breadcrumb.home'), to: '/' },
              { label: t('page.breadcrumb.search') },
            ]"
          />

          <h1
            class="
              font-display text-2xl font-semibold tracking-tight
              text-highlighted
              md:text-3xl
            "
          >
            {{ t('page.title') }}
          </h1>

          <UInput
            ref="inputRef"
            v-model="query"
            icon="i-heroicons-magnifying-glass"
            size="xl"
            :placeholder="t('page.search_placeholder')"
            autofocus
            class="w-full"
            :ui="{ root: 'w-full' }"
          >
            <template #trailing>
              <UKbd
                v-if="!query"
                value="/"
                size="sm"
              />
              <UButton
                v-else
                icon="i-heroicons-x-mark"
                color="neutral"
                variant="ghost"
                size="sm"
                :aria-label="t('page.no_results.clear_search')"
                @click="() => { query = '' }"
              />
            </template>
          </UInput>
        </div>
      </template>

      <div
        v-if="query && searchResults"
        class="
          flex flex-col gap-4
          md:flex-row md:items-center md:justify-between
        "
      >
        <p
          class="flex flex-wrap items-center gap-2 text-sm text-muted"
          role="status"
          aria-live="polite"
        >
          <span>{{ t('page.results_count', { count: totalResults, query }) }}</span>
          <!-- Say so when the engine widened the query: the results
               below are not the ones that were asked for. -->
          <span
            v-if="relaxedQuery"
            class="text-warning"
          >
            {{ t('page.relaxed_notice', { query: relaxedQuery }) }}
          </span>
        </p>

        <!-- The INACTIVE trigger is `text-muted`, and a pill list sits
             on `bg-elevated` — the surface muted is not calibrated
             against. Measured 4.39:1 on "Προϊόντα"/"Άρθρα", the labels
             that say what else the search found. -->
        <UTabs
          v-model="activeTab"
          :items="tabItems"
          color="neutral"
          variant="pill"
          size="sm"
          :ui="{ trigger: 'data-[state=inactive]:text-toned' }"
        />
      </div>
    </PageSectionBand>

    <UContainer class="flex-1 py-10">
      <div
        v-if="isSearching && displayResults.length === 0"
        class="flex flex-col gap-4"
      >
        <div
          v-for="i in 6"
          :key="i"
          class="flex gap-4 rounded-xl bg-default p-4 ring ring-default"
        >
          <USkeleton class="size-28 shrink-0 rounded-lg" />
          <div class="flex flex-1 flex-col gap-3">
            <USkeleton class="h-6 w-3/4" />
            <USkeleton class="h-4 w-full" />
            <USkeleton class="h-4 w-5/6" />
          </div>
        </div>
      </div>

      <div
        v-else-if="!query"
        class="flex flex-col items-center gap-6 py-16"
      >
        <UEmpty
          icon="i-heroicons-magnifying-glass"
          :title="t('page.empty.title')"
          :description="t('page.empty.description')"
          size="lg"
        />
        <div class="flex flex-wrap items-center justify-center gap-4">
          <div
            v-for="shortcut in shortcuts"
            :key="shortcut.key"
            class="flex items-center gap-2 text-sm text-muted"
          >
            <UKbd :value="shortcut.key" />
            <span>{{ shortcut.description }}</span>
          </div>
        </div>
      </div>

      <UEmpty
        v-else-if="searchResults && displayResults.length === 0 && !isSearching"
        icon="i-heroicons-magnifying-glass-minus"
        :title="t('page.no_results.title')"
        :description="t('page.no_results.description', { query })"
        size="lg"
        class="py-16"
        :actions="[
          {
            label: t('page.no_results.clear_search'),
            icon: 'i-heroicons-arrow-path',
            color: 'secondary',
            size: 'lg',
            onClick: () => { query = '' },
          },
        ]"
      />

      <div
        v-else
        class="flex flex-col gap-8"
      >
        <ul class="flex flex-col gap-3">
          <li
            v-for="(result, index) in displayResults"
            :key="`${result.contentType}-${result.id}`"
            class="
              rounded-xl bg-default p-3 ring ring-default transition
              hover:ring-accented
              sm:p-4
            "
          >
            <SearchResult
              :result="result"
              @click="onResultClick(result, index)"
            />
          </li>
        </ul>

        <div
          v-if="totalPages > 1"
          class="flex flex-col items-center gap-4"
        >
          <UPagination
            v-model:page="page"
            :total="totalResults"
            :items-per-page="limit"
            color="neutral"
            variant="outline"
            active-color="secondary"
            active-variant="solid"
            show-edges
          />
          <div class="flex items-center gap-2 text-sm text-muted">
            <span>{{ t('page.per_page') }}</span>
            <USelectMenu
              v-model="limit"
              :items="[12, 24, 48, 96]"
              size="sm"
              class="w-20"
              @change="page = 1"
            />
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<i18n lang="yaml">
el:
  page:
    title: "Αναζήτηση"
    search_query: "Αναζήτηση {query}"
    search_placeholder: "Πληκτρολογήστε για αναζήτηση..."
    results_count: "{count} αποτελέσματα για \"{query}\""
    relaxed_notice: "— εμφανίζονται αποτελέσματα για \"{query}\""
    per_page: "Ανά σελίδα"
    breadcrumb:
      home: "Αρχική"
      search: "Αναζήτηση"
    tabs:
      all: "Όλα"
      products_label: "Προϊόντα"
      blog_posts_label: "Άρθρα"
    empty:
      title: "Ξεκινήστε την αναζήτησή σας"
      description: "Χρησιμοποιήστε το πεδίο αναζήτησης παραπάνω για να βρείτε προϊόντα και άρθρα που σας ενδιαφέρουν"
    no_results:
      title: "Δεν βρέθηκαν αποτελέσματα"
      description: "Δεν βρέθηκαν αποτελέσματα για \"{query}\". Δοκιμάστε διαφορετικούς όρους αναζήτησης"
      clear_search: "Εκκαθάριση αναζήτησης"
    shortcuts:
      focus_search: "Εστίαση στην αναζήτηση"
      clear_search: "Εκκαθάριση αναζήτησης"
en:
  page:
    title: "Search"
    search_query: "Search {query}"
    search_placeholder: "Type to search..."
    results_count: "{count} results for \"{query}\""
    relaxed_notice: "— showing results for \"{query}\""
    per_page: "Per page"
    breadcrumb:
      home: "Home"
      search: "Search"
    tabs:
      all: "All"
      products_label: "Products"
      blog_posts_label: "Articles"
    empty:
      title: "Start your search"
      description: "Use the search box above to find the products and articles you are interested in"
    no_results:
      title: "No results found"
      description: "No results were found for \"{query}\". Try different search terms"
      clear_search: "Clear the search"
    shortcuts:
      focus_search: "Focus the search"
      clear_search: "Clear the search"
</i18n>
