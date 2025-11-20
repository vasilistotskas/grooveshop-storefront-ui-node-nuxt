<script lang="ts" setup>
definePageMeta({
  layout: 'default',
})

const route = useRoute('search')
const { t, locale } = useI18n()

const query = ref(
  Array.isArray(route.query.query)
    ? route.query.query[0] ?? ''
    : route.query.query ?? '',
)
const limit = ref(12)
const page = ref(1)
const activeTab = ref<'all' | 'products' | 'blogPosts'>('all')

const offset = computed(() => (page.value - 1) * limit.value)

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

  const productsTotal = searchResults.value.products?.estimatedTotalHits || 0
  const blogPostsTotal = searchResults.value.blogPosts?.estimatedTotalHits || 0

  if (activeTab.value === 'products') return productsTotal
  if (activeTab.value === 'blogPosts') return blogPostsTotal

  return productsTotal + blogPostsTotal
})

const totalPages = computed(() => Math.ceil(totalResults.value / limit.value))

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

onMounted(() => {
  if (inputRef.value) {
    inputRef.value.$el.querySelector('input')?.focus()
  }

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
      e.preventDefault()
      inputRef.value.$el.querySelector('input')?.focus()
    }
    if (e.key === 'Escape' && document.activeElement?.tagName === 'INPUT') {
      query.value = ''
    }
  }

  window.addEventListener('keydown', handleKeydown)

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
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
  <div class="flex min-h-[calc(100vh-200px)] flex-col">
    <div
      class="
        border-b border-gray-200 bg-white
        dark:border-gray-800 dark:bg-elevated/50
      "
    >
      <UContainer
        class="
          py-4
          lg:py-8
        "
      >
        <UBreadcrumb
          :items="[
            { label: t('page.breadcrumb.home'), to: '/' },
            { label: t('page.breadcrumb.search') },
          ]"
          class="mb-6"
        />

        <div class="mb-6">
          <h1
            class="
              mb-4 text-4xl font-bold text-gray-900
              dark:text-gray-100
            "
          >
            {{ t('page.title') }}
          </h1>

          <div class="relative">
            <UInput
              ref="inputRef"
              v-model="query"
              icon="i-heroicons-magnifying-glass"
              size="xl"
              :placeholder="t('page.search_placeholder')"
              autofocus
              class="w-full"
              :ui="{
                root: 'w-full',
              }"
            >
              <template #trailing>
                <div class="flex items-center gap-2">
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
                    @click="query = ''"
                  />
                </div>
              </template>
            </UInput>
          </div>
        </div>

        <div
          v-if="query && searchResults"
          class="
            flex flex-col gap-4
            md:flex-row md:items-center md:justify-between
          "
        >
          <div
            class="
              flex items-center gap-2 text-sm text-gray-600
              dark:text-gray-400
            "
          >
            <UIcon
              name="i-heroicons-information-circle"
              class="size-4 text-info"
            />
            <span>
              {{
                t('page.results_count', {
                  count: totalResults,
                  query: query,
                })
              }}
            </span>
          </div>

          <UTabs
            v-model="activeTab"
            :items="tabItems"
            color="neutral"
          >
            <template #default="{ item }">
              <div class="flex cursor-pointer items-center gap-2">
                <span>{{ item.label }}</span>
              </div>
            </template>
          </UTabs>
        </div>
      </UContainer>
    </div>

    <UContainer class="flex-1 py-8">
      <div
        v-if="status === 'pending' && !searchResults"
        class="space-y-4"
      >
        <UCard
          v-for="i in 6"
          :key="i"
          class="overflow-hidden"
        >
          <div class="flex gap-4">
            <USkeleton class="size-32 shrink-0 rounded-lg" />
            <div class="flex-1 space-y-3">
              <USkeleton class="h-7 w-3/4" />
              <USkeleton class="h-4 w-full" />
              <USkeleton class="h-4 w-5/6" />
              <div class="flex items-center gap-2">
                <USkeleton class="h-5 w-20" />
                <USkeleton class="h-5 w-24" />
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <div
        v-else-if="!query"
        class="
          flex min-h-[400px] flex-col items-center justify-center py-16
          text-center
        "
      >
        <div
          class="
            mb-6 flex size-24 items-center justify-center rounded-full
            bg-gray-100
            dark:bg-gray-800
          "
        >
          <UIcon
            name="i-heroicons-magnifying-glass"
            class="
              size-12 text-gray-400
              dark:text-gray-600
            "
          />
        </div>
        <h2
          class="
            mb-2 text-2xl font-semibold text-gray-900
            dark:text-gray-100
          "
        >
          {{ t('page.empty.title') }}
        </h2>
        <p
          class="
            mb-6 max-w-md text-gray-600
            dark:text-gray-400
          "
        >
          {{ t('page.empty.description') }}
        </p>

        <div class="flex flex-wrap items-center justify-center gap-4">
          <div
            v-for="shortcut in shortcuts"
            :key="shortcut.key"
            class="
              flex items-center gap-2 text-sm text-gray-500
              dark:text-gray-500
            "
          >
            <UKbd :value="shortcut.key" />
            <span>{{ shortcut.description }}</span>
          </div>
        </div>
      </div>

      <div
        v-else-if="
          searchResults
            && displayResults.length === 0
            && status !== 'pending'
        "
        class="
          flex min-h-[400px] flex-col items-center justify-center py-16
          text-center
        "
      >
        <div
          class="
            mb-6 flex size-24 items-center justify-center rounded-full bg-red-50
            dark:bg-red-950/20
          "
        >
          <UIcon
            name="i-heroicons-magnifying-glass-minus"
            class="
              size-12 text-red-400
              dark:text-red-600
            "
          />
        </div>
        <h2
          class="
            mb-2 text-2xl font-semibold text-gray-900
            dark:text-gray-100
          "
        >
          {{ t('page.no_results.title') }}
        </h2>
        <p
          class="
            mb-6 max-w-md text-gray-600
            dark:text-gray-400
          "
        >
          {{ t('page.no_results.description', { query }) }}
        </p>
        <UButton
          icon="i-heroicons-arrow-path"
          color="neutral"
          @click="query = ''"
        >
          {{ t('page.no_results.clear_search') }}
        </UButton>
      </div>

      <div
        v-else
        class="space-y-6"
      >
        <div class="space-y-4">
          <UCard
            v-for="result in displayResults"
            :key="`${result.contentType}-${result.id}`"
            class="
              cursor-pointer overflow-hidden transition-all
              hover:shadow-lg hover:ring-2 hover:ring-primary-500
              dark:hover:ring-primary-400
            "
            :ui="{
              body: `
                dark:bg-elevated/50
                p-2
                sm:p-4
              `,
            }"
          >
            <SearchResult :result="result" />
          </UCard>
        </div>

        <div
          v-if="totalPages > 1"
          class="flex justify-center pt-6"
        >
          <UPagination
            v-model="page"
            :total="totalResults"
            :page-count="limit"
            show-first
            show-last
            :ui="{
              root: 'flex items-center gap-1',
            }"
          />
        </div>

        <div class="flex items-center justify-center gap-2 text-sm">
          <span
            class="
              text-gray-600
              dark:text-gray-400
            "
          >
            {{ t('page.per_page') }}
          </span>
          <USelectMenu
            v-model="limit"
            :options="[12, 24, 48, 96]"
            size="sm"
            class="w-20"
            @change="page = 1"
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
    results_count: "{count} αποτελέσματα για \"{query}\""
    per_page: Ανά σελίδα
    breadcrumb:
      home: Αρχική
      search: Αναζήτηση
    tabs:
      all: Όλα
      products_label: Προϊόντα
      blog_posts_label: Άρθρα
      products: Προϊόντα ({count})
      blog_posts: Άρθρα ({count})
    empty:
      title: Ξεκινήστε την αναζήτησή σας
      description: Χρησιμοποιήστε το πεδίο αναζήτησης παραπάνω για να βρείτε προϊόντα και άρθρα που σας ενδιαφέρουν
    no_results:
      title: Δεν βρέθηκαν αποτελέσματα
      description: Δεν βρέθηκαν αποτελέσματα για "{query}". Δοκιμάστε διαφορετικούς όρους αναζήτησης
      clear_search: Εκκαθάριση αναζήτησης
    shortcuts:
      focus_search: Εστίαση στην αναζήτηση
      clear_search: Εκκαθάριση αναζήτησης
</i18n>
