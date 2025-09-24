<script lang="ts" setup>
const searchBarFocused = defineModel<boolean>('searchBarFocused', {
  required: true,
})
const { locale } = useI18n()
const keepFocus = ref(false)
const router = useRouter()
const route = useRoute()
const { $i18n } = useNuxtApp()
const { productUrl, blogPostUrlFromParts } = useUrls()

const query = ref(Array.isArray(route.query.query) ? (route.query.query[0] ?? '') : (route.query.query ?? ''))
const limit = ref(Array.isArray(route.query.limit) ? (route.query.limit[0] ?? 3) : (route.query.limit ?? 3))
const offset = ref(Array.isArray(route.query.offset) ? (route.query.offset[0] ?? 0) : (route.query.offset ?? 0))
const highlighted = ref<string | undefined>(undefined)
const autocomplete = ref<HTMLElement | null>(null)
const search = ref<HTMLInputElement | null>(null)
const allResults = ref<SearchResponse | undefined>(undefined)

const visibleElements = computed<string[]>(() => {
  if (!data.value) return []

  const visible: string[] = []
  Object.entries(data.value).forEach(([_s, v]) => {
    if (!v || !v.results) return
    visible.push(...v.results.map(e => String(e.id)))
  })
  return visible
})

const hasResults = computed(() => {
  if (!data.value) return false

  let has = false
  Object.entries(data.value).forEach(([_s, v]) => {
    if (v && v.results && v.results.length > 0) {
      has = true
    }
  })
  return has
})

function searchFocus(): void {
  searchBarFocused.value = true
  highlighted.value = undefined
}

function searchBlur(): void {
  if (keepFocus.value) {
    setTimeout(() => {
      if (searchBarFocused.value) document.getElementById('search')?.focus()
    }, 0)
    keepFocus.value = false
  }
  else {
    searchBarFocused.value = false
  }
}

function searchGo(cleanQuery: boolean): void {
  if (query.value.length === 0) return

  searchBarFocused.value = false

  setTimeout(() => {
    router.push(`/search?query=${query.value}`)
    if (cleanQuery) {
      query.value = ''
    }
    document.getElementById('search')?.blur()
  }, 0)
}

function searchGoTo(id: string, cleanQuery: boolean): void {
  if (!data.value) return

  let url = ''

  const allResults = [
    ...data.value.products.results,
    ...data.value.blogPosts.results,
  ]

  const targetResult = allResults.find(result => String(result.id) === id)

  if (targetResult) {
    if (targetResult.contentType === 'product') {
      url = productUrl(targetResult.id, targetResult.slug)
    }
    else if (targetResult.contentType === 'blog_post') {
      url = blogPostUrlFromParts(targetResult.id, targetResult.slug)
    }
  }

  if (!url) return

  router.push(url)
  searchBarFocused.value = false
  if (cleanQuery) {
    query.value = ''
  }
  document.getElementById('search')?.blur()
}

function onKeyDown(e: KeyboardEvent): void {
  let index
  switch (e.key) {
    case 'Escape':
      document.getElementById('search')?.blur()
      break

    case 'ArrowDown':
      index = visibleElements.value.indexOf(highlighted.value || '')
      if (index === -1 && visibleElements.value.length > 0) {
        highlighted.value = visibleElements.value[0]
      }
      else if (index >= 0 && index < visibleElements.value.length - 1) {
        highlighted.value = visibleElements.value[index + 1]
      }
      e.preventDefault()
      break

    case 'ArrowUp':
      index = visibleElements.value.indexOf(highlighted.value || '')
      if (index === 0) {
        highlighted.value = undefined
      }
      else if (index > 0) {
        highlighted.value = visibleElements.value[index - 1]
      }
      e.preventDefault()
      break

    case 'Enter':
      if (highlighted.value !== undefined) searchGoTo(highlighted.value, true)
      else searchGo(false)
      break
    default:
      break
  }
}

async function loadMoreSectionResults(
  { lim, off }: { lim: number, off: number },
): Promise<void> {
  offset.value = off + lim
}

const { data, status }
  = await useFetch('/api/search', {
    key: `search${query.value}`,
    method: 'GET',
    headers: useRequestHeaders(),
    credentials: 'omit',
    retry: 120,
    retryDelay: 1000,
    query: {
      query: query,
      language: locale,
      limit: limit,
      offset: offset,
    },
    immediate: query.value.length >= 3,
  })

watch(
  () => data.value,
  (results) => {
    if (!results) return
    if (!allResults.value) {
      allResults.value = results
    }
    else {
      Object.entries(results).forEach(([key, section]) => {
        if (!section || !section.results) return
        if (!allResults.value) return
        const sectionKey = key as keyof SearchResponse
        if (!allResults.value[sectionKey]) {
          Object.assign(allResults.value, { [sectionKey]: section })
        }
        else {
          const existingIds = new Set(allResults.value[sectionKey].results.map(r => r.id))
          const newResults = section.results.filter(r => !existingIds.has(r.id))
          Object.assign(allResults.value[sectionKey], {
            results: allResults.value[sectionKey].results.concat(newResults),
            estimatedTotalHits: section.estimatedTotalHits,
          })
        }
      })
    }
  },
  { deep: true, immediate: true },
)

onClickOutside(autocomplete, () => {
  searchBarFocused.value = false
  highlighted.value = undefined
}, {
  ignore: [search],
})
</script>

<template>
  <div
    class="
      grid
      md:relative
    "
  >
    <div
      class="
        relative grid w-full items-center
        lg:justify-items-center
      "
    >
      <UInput
        id="search"
        ref="search"
        v-model="query"
        class="
          w-full
          md:max-w-[calc(100%-10rem)]
        "
        color="secondary"
        :name="$i18n.t('search.title')"
        :trailing="false"
        :placeholder="$i18n.t('search.title') + '...'"
        :aria-label="$i18n.t('search.title') + '...'"
        @focus="searchFocus"
        @blur="searchBlur"
        @keydown="onKeyDown"
        @click="searchFocus"
      >
        <template #trailing>
          <UButton
            type="button"
            icon="i-heroicons-magnifying-glass-20-solid"
            size="sm"
            color="neutral"
            variant="ghost"
            :padded="false"
            :aria-label="$i18n.t('search.title')"
            :ui="{
              base: 'flex flex-col items-center gap-1 hover:bg-transparent cursor-pointer',
            }"
            @click="searchGo(false)"
          />
        </template>
      </UInput>
    </div>
    <LazySearchAutoComplete
      v-if="searchBarFocused"
      v-model:search-bar-focused="searchBarFocused"
      v-model:keep-focus="keepFocus"
      v-model:highlighted="highlighted"
      class="
        absolute top-12 right-0 max-h-[calc(100vh-80px)] rounded border
        border-primary-300 bg-primary-100 p-3.5
        md:top-10
        dark:border-primary-500 dark:bg-primary-900
      "
      :query="query"
      :limit="Number(limit)"
      :offset="Number(offset)"
      :all-results="allResults"
      :status="status"
      :has-results="hasResults"
      @load-more="loadMoreSectionResults"
    />
  </div>
</template>
