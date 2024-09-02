<script setup lang="ts">
import type { SearchBlogPost, SearchProduct, SearchResponse, SearchResult } from '~/types/search'

const searchBarFocused = defineModel<boolean>('searchBarFocused', {
  required: true,
})
const { t, locale } = useI18n()
const keepFocus = ref(false)
const router = useRouter()
const route = useRoute()
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

  router.push(`/search?query=${query.value}`)
  searchBarFocused.value = false
  if (cleanQuery) {
    query.value = ''
  }
  document.getElementById('search')?.blur()
}

function searchGoTo(id: string, cleanQuery: boolean): void {
  if (!data.value) return

  let url = ''
  Object.entries(data.value).forEach(([_s, v]) => {
    if (!v || !v.results) return
    const result = v.results.find(e => String(e.id) === id)
    if (result) {
      url = result.absoluteUrl
    }
  })

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

function showMoreSectionResults(section: SearchResult<SearchProduct | SearchBlogPost>, limit: number): boolean {
  return section.estimatedTotalHits > Number(limit)
}

function sectionExtraResults(section: SearchResult<SearchProduct | SearchBlogPost>, limit: number, offset: number): number {
  const remainingResults = section.estimatedTotalHits - offset - limit
  return Math.max(remainingResults, 0)
}

async function loadMoreSectionResults(section: SearchResult<SearchProduct | SearchBlogPost>, limit: number): Promise<void> {
  await execute()
  offset.value = Number(offset.value) + Number(limit)
}

const { data, execute } = await useLazyAsyncData(
  'search',
  () => $fetch('/api/search', {
    method: 'GET',
    credentials: 'omit',
    retry: 120,
    retryDelay: 1000,
    query: {
      query: query.value,
      language: locale.value,
      limit: limit.value,
      offset: offset.value,
    },
  }),
  {
    dedupe: 'cancel',
    immediate: false,
  },
)

watch(query, () => {
  if (query.value.length < 3) {
    data.value = undefined
    return
  }
  allResults.value = undefined
  execute()
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
    <form
      action="/search" autocomplete="off" method="GET" role="search" class="
        relative grid w-full items-center

        lg:justify-center lg:justify-items-center
      " @submit="searchGo(false)"
    >
      <UInput
        id="search"
        ref="search"
        v-model="query"
        class="w-full"
        size="xs"
        color="white"
        :name="t('common.search.title')"
        :trailing="false"
        :placeholder="t('common.search.title')"
        :aria-label="t('common.search.title')"
        :ui="{
          icon: {
            trailing: {
              pointer: '',
            },
          },
          color: {
            white: {
              outline: 'shadow-sm bg-white dark:bg-gray-900 text-gray-900 '
                + 'dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400',
            },
          },
        }"
        @focus="searchFocus"
        @blur="searchBlur"
        @keydown="onKeyDown"
        @click="searchFocus"
      >
        <template #trailing>
          <UButton
            type="submit"
            icon="i-heroicons-magnifying-glass-20-solid"
            size="sm"
            color="white"
            variant="ghost"
            :padded="false"
            :aria-label="t('common.search.title')"
          />
        </template>
      </UInput>
    </form>
    <!-- Autocomplete -->
    <ClientOnly>
      <div
        v-if="searchBarFocused && allResults && hasResults && query.length !== 0"
        ref="autocomplete"
        class="
          shadow-4xl absolute right-0 top-12 flex max-h-[calc(100vh-80px)]
          w-full flex-col gap-4 overflow-auto rounded border p-3.5
          border-primary-300 bg-primary-100

          dark:border-primary-500 dark:bg-primary-900

          md:top-10
        "
      >
        <div class="grid">
          <div
            v-for="([key, section]) in Object.entries(allResults)" :key="key" class="
              flex flex-col gap-2
            "
          >
            <template v-if="section && section.results && section.results.length > 0">
              <div class="flex items-center">
                <span
                  class="
                    text-md me-4 flex-shrink text-primary-950

                    dark:text-primary-50
                  "
                >
                  {{ t(`common.sections.${key}`) }}
                </span>
                <div
                  class="
                    flex-grow border-t border-primary-300

                    dark:border-primary-500
                  "
                />
              </div>

              <ul v-for="result in section?.results" :key="result.id">
                <SearchResultItem
                  :highlighted="highlighted ? highlighted === String(result.id) : false"
                  :item="result"
                  @click="searchBarFocused = false"
                  @mousedown="keepFocus = true"
                  @mouseover="highlighted = undefined"
                />
              </ul>

              <div
                v-if="showMoreSectionResults(section, Number(limit))"
                class="-mt-2"
              >
                <UButton v-if="sectionExtraResults(section, Number(limit), Number(offset)) > 0" variant="link" size="sm" @mousedown="keepFocus = true" @click="loadMoreSectionResults(section, Number(limit))">
                  {{ t("common.results_left", sectionExtraResults(section, Number(limit), Number(offset))) }}
                </UButton>
                <span class="text-sm text-primary-400">
                  {{ section.estimatedTotalHits > Number(limit) ? t("common.approx_results", section.estimatedTotalHits) : t("results", section.estimatedTotalHits) }}
                </span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </ClientOnly>
  </div>
</template>
