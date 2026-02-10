<script lang="ts" setup>
import { refDebounced } from '@vueuse/core'

const props = defineProps<{
  open: boolean
  query: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:query': [value: string]
}>()

const { isMobileOrTablet } = useDevice()
const router = useRouter()
const { t, locale } = useI18n()

const localQuery = computed({
  get: () => props.query,
  set: value => emit('update:query', value),
})

const localOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value),
})

const debouncedQuery = refDebounced(localQuery, 200)

const allLoadedResults = ref<{
  products: ProductMeiliSearchResult[]
  blogPosts: BlogPostMeiliSearchResult[]
}>({
  products: [],
  blogPosts: [],
})

const limit = ref(3)
const offset = ref(0)
const activeTab = ref<'all' | 'products' | 'blogPosts'>('all')

const {
  data: searchResults,
  status,
  execute,
} = await useLazyFetch<SearchResponse>('/api/search', {
  query: {
    query: debouncedQuery,
    languageCode: locale,
    limit,
    offset,
  },
  immediate: false,
  watch: false,
})

const filteredResults = computed(() => {
  if (!allLoadedResults.value) return []

  const products = allLoadedResults.value.products
  const blogPosts = allLoadedResults.value.blogPosts

  if (activeTab.value === 'products') {
    return products
  }
  else if (activeTab.value === 'blogPosts') {
    return blogPosts
  }

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

function close() {
  localOpen.value = false
}

function goToSearchPage() {
  if (localQuery.value) {
    router.push(`/search?query=${localQuery.value}`)
    localOpen.value = false
  }
}

function loadMore() {
  offset.value += limit.value
  execute()
}

defineShortcuts({
  enter: {
    usingInput: 'queryInput',
    handler: () => goToSearchPage(),
  },
})

watch(activeTab, () => {
  offset.value = 0
})

watch(debouncedQuery, (newQuery) => {
  if (newQuery && newQuery.length >= 2) {
    offset.value = 0
    allLoadedResults.value = { products: [], blogPosts: [] }
    execute()
  }
  else {
    allLoadedResults.value = { products: [], blogPosts: [] }
  }
})

watch(
  searchResults,
  (newResults) => {
    if (!newResults) return

    if (offset.value === 0) {
      allLoadedResults.value = {
        products: newResults.products?.results || [],
        blogPosts: newResults.blogPosts?.results || [],
      }
    }
    else {
      allLoadedResults.value = {
        products: [
          ...allLoadedResults.value.products,
          ...(newResults.products?.results || []),
        ],
        blogPosts: [
          ...allLoadedResults.value.blogPosts,
          ...(newResults.blogPosts?.results || []),
        ],
      }
    }
  },
  { deep: true },
)

// Execute initial search if query is provided (e.g., from URL or parent component)
if (localQuery.value && localQuery.value.length >= 2) {
  allLoadedResults.value = { products: [], blogPosts: [] }
  execute()
}
</script>

<template>
  <UModal
    v-model:open="localOpen"
    :title="t('search.title')"
    :fullscreen="isMobileOrTablet"
    :description="t('search.description')"
    :ui="{
      content: 'max-h-[85vh] max-w-3xl',
      body: 'p-0',
      footer: 'md:h-16',
    }"
  >
    <template #header>
      <div class="flex w-full items-center gap-3">
        <UIcon name="i-heroicons-magnifying-glass" class="size-5 text-gray-400" />
        <UInput
          v-model="localQuery"
          name="queryInput"
          type="text"
          :placeholder="t('search.modal_placeholder')"
          class="
            flex-1 gap-2 border-0 bg-transparent text-base
            focus:outline-none
            md:gap-4
          "
          autofocus
        >
          <UKbd v-if="!isMobileOrTablet" value="ESC" />
          <UButton
            v-if="isMobileOrTablet"
            icon="i-heroicons-x-mark"
            color="error"
            variant="ghost"
            size="sm"
            @click="close"
          />
        </UInput>
      </div>
    </template>

    <template #body>
      <div
        v-if="searchResults"
        class="
          flex gap-1 border-b border-gray-200 px-4 pt-2 pb-4
          md:pt-0
          dark:border-gray-700
        "
      >
        <UButton
          :label="t('search.tabs.all')"
          :variant="activeTab === 'all' ? 'soft' : 'ghost'"
          size="sm"
          @click="activeTab = 'all'"
        />
        <UButton
          :label="
            t('search.tabs.products', {
              count: searchResults.products?.estimatedTotalHits || 0,
            })
          "
          :variant="activeTab === 'products' ? 'soft' : 'ghost'"
          size="sm"
          @click="activeTab = 'products'"
        />
        <UButton
          :label="
            t('search.tabs.blog_posts', {
              count: searchResults.blogPosts?.estimatedTotalHits || 0,
            })
          "
          :variant="activeTab === 'blogPosts' ? 'soft' : 'ghost'"
          size="sm"
          @click="activeTab = 'blogPosts'"
        />
      </div>

      <div
        class="
          h-full overflow-y-auto
          md:h-[60vh]
        "
      >
        <div
          v-if="status === 'pending' && !searchResults"
          class="space-y-3 p-6"
        >
          <USkeleton v-for="i in 3" :key="i" class="h-20 w-full" />
        </div>

        <div
          v-else-if="!localQuery || localQuery.length < 2"
          class="p-12 text-center"
        >
          <UIcon
            name="i-heroicons-magnifying-glass"
            class="
              mx-auto mb-4 size-12 text-gray-300
              dark:text-gray-600
            "
          />
          <p class="text-sm text-gray-500">
            {{ t('search.start_typing') }}
          </p>
        </div>

        <div
          v-else-if="
            searchResults
              && filteredResults.length === 0
              && status !== 'pending'
          "
          class="p-12 text-center"
        >
          <UIcon
            name="i-heroicons-magnifying-glass-minus"
            class="
              mx-auto mb-4 size-12 text-gray-300
              dark:text-gray-600
            "
          />
          <p
            class="
              mb-2 font-medium text-gray-600
              dark:text-gray-200
            "
          >
            {{ t('search.no_results') }}
          </p>
          <p class="text-sm text-gray-500">
            {{ t('search.try_different') }}
          </p>
        </div>

        <div
          v-else class="
            grid gap-2 divide-y divide-gray-100 px-1 pt-2
            dark:divide-gray-800
          "
        >
          <SearchResult
            v-for="result in filteredResults"
            :key="`${result.contentType}-${result.id}`"
            :result="result"
            @click="close"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        v-if="
          filteredResults.length > 0
            && filteredResults.length < totalResults
        "
        :label="t('search.load_more')"
        variant="ghost"
        color="neutral"
        block
        :loading="status === 'pending'"
        @click="loadMore"
      />

      <div class="flex w-full items-center justify-end">
        <UButton
          v-if="localQuery && filteredResults.length > 0"
          :label="t('search.view_all_results')"
          size="sm"
          color="neutral"
          variant="subtle"
          @click="goToSearchPage"
        />
      </div>
    </template>
  </UModal>
</template>

<i18n lang="yaml">
el:
  search:
    title: Αναζήτηση
    description: Αναζήτηση
    modal_placeholder: Αναζήτηση...
    tabs:
      all: Όλα
      products: Προϊόντα ({count})
      blog_posts: Άρθρα ({count})
    start_typing: Ξεκίνα να πληκτρολογείς για αναζήτηση
    no_results: Δεν βρέθηκαν αποτελέσματα
    try_different: Δοκίμασς διαφορετικούς όρους αναζήτησης
    load_more: Φόρτωση περισσότερων
    navigate: Πλοήγηση
    select: Επιλογή
    view_all_results: Προβολή όλων
</i18n>
