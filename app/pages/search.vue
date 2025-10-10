<script lang="ts" setup>
definePageMeta({
  layout: 'default',
})

const route = useRoute('search')
const { t, locale } = useI18n()

// Search parameters
const query = ref(
  Array.isArray(route.query.query)
    ? route.query.query[0] ?? ''
    : route.query.query ?? '',
)
const limit = ref(12)
const offset = ref(0)
const activeTab = ref<'all' | 'products' | 'blogPosts'>('all')

const {
  data: searchResults,
  status,
} = await useFetch<SearchResponse>('/api/search', {
  query: {
    query,
    languageCode: locale,
    limit,
    offset,
  },
  watch: [query, limit, offset],
})

// Computed results based on active tab
const displayResults = computed(() => {
  if (!searchResults.value) return []

  const products = searchResults.value.products?.results || []
  const blogPosts = searchResults.value.blogPosts?.results || []

  if (activeTab.value === 'products') return products
  if (activeTab.value === 'blogPosts') return blogPosts

  return [...products, ...blogPosts]
})

const totalResults = computed(() => {
  if (!searchResults.value) return 0

  const productsTotal
    = searchResults.value.products?.estimatedTotalHits || 0
  const blogPostsTotal
    = searchResults.value.blogPosts?.estimatedTotalHits || 0

  if (activeTab.value === 'products') return productsTotal
  if (activeTab.value === 'blogPosts') return blogPostsTotal

  return productsTotal + blogPostsTotal
})

const hasMore = computed(() => {
  return displayResults.value.length < totalResults.value
})

// Load more results
function loadMore() {
  offset.value += limit.value
}

// Reset offset when changing tabs
watch(activeTab, () => {
  offset.value = 0
})

// Update URL when query changes
watch(query, (newQuery) => {
  if (newQuery) {
    navigateTo({
      query: { query: newQuery },
    })
  }
})

// SEO
useHead({
  title: computed(() =>
    query.value
      ? t('page.search_query', { query: query.value })
      : t('page.title'),
  ),
})
</script>

<template>
  <div
    class="
      min-h-screen bg-gray-50
      dark:bg-gray-900
    "
  >
    <UContainer class="py-8">
      <div class="mb-8">
        <h1
          class="
            mb-4 text-3xl font-bold text-gray-900
            dark:text-gray-100
          "
        >
          {{ t('page.title') }}
        </h1>

        <div class="max-w-2xl">
          <UInput
            v-model="query"
            icon="i-lucide-search"
            size="lg"
            :placeholder="t('page.search_placeholder')"
            autofocus
          />
        </div>

        <div
          v-if="query && searchResults"
          class="
            mt-4 text-sm text-gray-600
            dark:text-gray-400
          "
        >
          {{
            t('page.results_count', {
              count: totalResults,
              query: query,
            })
          }}
        </div>
      </div>

      <div
        v-if="searchResults && query"
        class="
          mb-6 flex gap-2 border-b border-gray-200 pb-2
          dark:border-gray-700
        "
      >
        <UButton
          :label="t('page.tabs.all')"
          :variant="activeTab === 'all' ? 'soft' : 'ghost'"
          :color="activeTab === 'all' ? 'secondary' : 'primary'"
          @click="activeTab = 'all'"
        />
        <UButton
          :label="
            t('page.tabs.products', {
              count: searchResults.products?.estimatedTotalHits || 0,
            })
          "
          :variant="activeTab === 'products' ? 'soft' : 'ghost'"
          :color="activeTab === 'products' ? 'neutral' : 'primary'"
          @click="activeTab = 'products'"
        />
        <UButton
          :label="
            t('page.tabs.blog_posts', {
              count: searchResults.blogPosts?.estimatedTotalHits || 0,
            })
          "
          :variant="activeTab === 'blogPosts' ? 'soft' : 'ghost'"
          :color="activeTab === 'blogPosts' ? 'neutral' : 'primary'"
          @click="activeTab = 'blogPosts'"
        />
      </div>

      <div v-if="status === 'pending' && !searchResults" class="space-y-4">
        <UCard v-for="i in 6" :key="i">
          <div class="flex gap-4">
            <USkeleton class="h-24 w-24" />
            <div class="flex-1 space-y-2">
              <USkeleton class="h-6 w-3/4" />
              <USkeleton class="h-4 w-full" />
              <USkeleton class="h-4 w-2/3" />
            </div>
          </div>
        </UCard>
      </div>

      <div
        v-else-if="!query"
        class="py-16 text-center"
      >
        <UIcon
          name="i-lucide-search"
          class="
            mx-auto mb-4 size-16 text-gray-300
            dark:text-gray-600
          "
        />
        <h2
          class="
            mb-2 text-xl font-semibold text-gray-700
            dark:text-gray-300
          "
        >
          {{ t('page.empty.title') }}
        </h2>
        <p class="text-gray-500">
          {{ t('page.empty.description') }}
        </p>
      </div>

      <div
        v-else-if="
          searchResults
            && displayResults.length === 0
            && status !== 'pending'
        "
        class="py-16 text-center"
      >
        <UIcon
          name="i-lucide-search-x"
          class="
            mx-auto mb-4 size-16 text-gray-300
            dark:text-gray-600
          "
        />
        <h2
          class="
            mb-2 text-xl font-semibold text-gray-700
            dark:text-gray-300
          "
        >
          {{ t('page.no_results.title') }}
        </h2>
        <p class="text-gray-500">
          {{ t('page.no_results.description') }}
        </p>
      </div>

      <div v-else class="space-y-4">
        <UCard
          v-for="result in displayResults"
          :key="`${result.contentType}-${result.id}`"
          :ui="{
            root: 'transition-shadow cursor-pointer hover:shadow-md',
          }"
        >
          <SearchResult :result="result" />
        </UCard>

        <div v-if="hasMore" class="flex justify-center pt-6">
          <UButton
            :label="t('page.load_more')"
            size="lg"
            variant="outline"
            :loading="status === 'pending'"
            @click="loadMore"
          />
        </div>
      </div>
    </UContainer>
  </div>
</template>

<i18n lang="yaml">
el:
  page:
    title: Αναζήτηση
    search_query: Αναζήτηση {query}
    search_placeholder: Πληκτρολογήστε για αναζήτηση...
    results_count: Βρέθηκαν {count} αποτελέσματα για "{query}"
    tabs:
      all: Όλα
      products: Προϊόντα ({count})
      blog_posts: Άρθρα ({count})
    empty:
      title: Ξεκινήστε την αναζήτησή σας
      description: Πληκτρολογήστε κάτι στο πεδίο αναζήτησης παραπάνω
    no_results:
      title: Δεν βρέθηκαν αποτελέσματα
      description: Δοκιμάστε διαφορετικούς όρους αναζήτησης ή επιστρέψτε στην αρχική σελίδα
    load_more: Φόρτωση περισσότερων αποτελεσμάτων
</i18n>
