<script lang="ts" setup>
// Webside's drawing of the search page; the searches and the URL state
// are `useStorefrontSearch`'s, the same as the default page's.
const { t } = useI18n()

const {
  blogEnabled,
  query,
  tab,
  page,
  limit,
  draft,
  commitDraft,
  search,
  hasQuery,
  products,
  guides,
  productCount,
  guideCount,
  openCount,
  pending,
  relaxedQuery,
  selectTab,
  pageLink,
  changeLimit,
  onProductClick,
  onGuideClick,
} = await useStorefrontSearch({ asideGuides: 0 })

const displayResults = computed<SearchResult[]>(() =>
  tab.value === 'guides' ? guides.value?.results ?? [] : products.value?.results ?? [],
)

const totalPages = computed(() => Math.ceil(openCount.value / limit.value))

// The open tab names the list a result came from.
function onResultClick(index: number) {
  const post = tab.value === 'guides' ? guides.value?.results[index] : undefined
  const product = tab.value === 'products' ? products.value?.results[index] : undefined
  if (post) onGuideClick(post, index)
  if (product) onProductClick(product, index)
}

const tabItems = computed(() => [
  {
    value: 'products',
    label: t('page.tabs.products_label'),
    badge: productCount.value,
  },
  ...(blogEnabled.value
    ? [{
        value: 'guides',
        label: t('page.tabs.blog_posts_label'),
        badge: guideCount.value,
      }]
    : []),
])

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
    search('')
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
              v-model="draft"
              icon="i-heroicons-magnifying-glass"
              size="xl"
              :placeholder="t('page.search_placeholder')"
              autofocus
              class="w-full"
              :ui="{
                root: 'w-full',
              }"
              @update:model-value="commitDraft"
            >
              <template #trailing>
                <div class="flex items-center gap-2">
                  <UKbd
                    v-if="!draft"
                    value="/"
                    size="sm"
                  />
                  <UButton
                    v-else
                    icon="i-heroicons-x-mark"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    @click="() => search('')"
                  />
                </div>
              </template>
            </UInput>
          </div>
        </div>

        <div
          v-if="hasQuery"
          class="
            flex flex-col gap-4
            md:flex-row md:items-center md:justify-between
          "
        >
          <div
            class="
              flex items-center gap-2 text-sm text-gray-600
              dark:text-gray-200
            "
          >
            <UIcon
              name="i-heroicons-information-circle"
              class="size-4 text-info"
            />
            <span>
              {{
                t('page.results_count', {
                  count: openCount,
                  query: query,
                })
              }}
            </span>
            <span
              v-if="relaxedQuery"
              class="text-warning"
              role="status"
            >
              {{ t('page.relaxed_notice', { query: relaxedQuery }) }}
            </span>
          </div>

          <div class="flex items-center gap-4">
            <UTabs
              :model-value="tab"
              :items="tabItems"
              color="neutral"
              @update:model-value="selectTab"
            >
              <template #default="{ item }">
                <div class="flex cursor-pointer items-center gap-2">
                  <span>{{ item.label }}</span>
                </div>
              </template>
            </UTabs>
          </div>
        </div>
      </UContainer>
    </div>

    <UContainer class="flex-1 py-8">
      <div
        v-if="pending && displayResults.length === 0"
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
        v-else-if="!hasQuery"
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
            dark:text-gray-200
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
          displayResults.length === 0
            && !pending
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
            dark:text-gray-200
          "
        >
          {{ t('page.no_results.description', { query }) }}
        </p>
        <UButton
          icon="i-heroicons-arrow-path"
          color="neutral"
          @click="() => search('')"
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
            v-for="(result, index) in displayResults"
            :key="`${result.contentType}-${result.id}`"
            class="
              cursor-pointer overflow-hidden transition-all
              hover:shadow-lg hover:ring-2 hover:ring-primary-500
              dark:hover:ring-primary-400
            "
            :ui="{
              body: `
                p-2
                sm:p-4
                dark:bg-elevated/50
              `,
            }"
          >
            <WebsideSearchResult
              :result="result"
              @click="onResultClick(index)"
            />
          </UCard>
        </div>

        <div
          v-if="totalPages > 1"
          class="flex justify-center pt-6"
        >
          <UPagination
            :page="page"
            :to="pageLink"
            :total="openCount"
            :items-per-page="limit"
            show-edges
            :ui="{
              root: 'flex items-center gap-1',
            }"
          />
        </div>

        <div class="flex items-center justify-center gap-2 text-sm">
          <span
            class="
              text-gray-600
              dark:text-gray-200
            "
          >
            {{ t('page.per_page') }}
          </span>
          <USelectMenu
            :model-value="limit"
            :items="[12, 24, 48, 96]"
            size="sm"
            class="w-20"
            @update:model-value="changeLimit"
          />
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
