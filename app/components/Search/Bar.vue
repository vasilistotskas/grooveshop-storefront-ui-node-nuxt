<script setup lang="ts">
import type { SearchResponse } from '~/types/search'

const searchBarFocused = defineModel<boolean>('searchBarFocused', {
  required: true,
})
const { locale } = useI18n()
const keepFocus = ref(false)
const router = useRouter()
const route = useRoute()
const { isMobileOrTablet } = useDevice()
const localePath = useLocalePath()

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

async function loadMoreSectionResults(
  { lim, off }: { lim: number, off: number },
): Promise<void> {
  offset.value = off + lim
  await execute()
}

const { data, execute, status } = await useLazyAsyncData(
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

const debouncedExecute = useDebounceFn(async () => {
  if (query.value.length < 3) {
    data.value = undefined
    return
  }
  allResults.value = undefined
  await execute()
}, 250)

watch(query, async () => {
  await debouncedExecute()
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
    v-if="!isMobileOrTablet && localePath(route.path) !== '/search'"
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
        class="w-full md:max-w-[calc(100%-10rem)]"
        size="xs"
        color="white"
        :name="$t('search.title')"
        :trailing="false"
        :placeholder="$t('search.title')"
        :aria-label="$t('search.title')"
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
            type="button"
            icon="i-heroicons-magnifying-glass-20-solid"
            size="sm"
            color="white"
            variant="ghost"
            :padded="false"
            :aria-label="$t('search.title')"
            @click="searchGo(false)"
          />
        </template>
      </UInput>
    </div>
    <SearchAutoComplete
      v-if="searchBarFocused"
      v-model:search-bar-focused="searchBarFocused"
      v-model:keep-focus="keepFocus"
      v-model:highlighted="highlighted"
      class="
        absolute right-0 top-12 max-h-[calc(100vh-80px)] rounded border p-3.5
        border-primary-300 bg-primary-100

        dark:border-primary-500 dark:bg-primary-900

        md:top-10
      "
      :query="query"
      :limit="limit"
      :offset="offset"
      :all-results="allResults"
      :status="status"
      :has-results="hasResults"
      @load-more="loadMoreSectionResults"
    />
  </div>
</template>
