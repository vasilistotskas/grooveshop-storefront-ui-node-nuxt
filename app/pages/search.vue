<script lang="ts" setup>
const searchStore = useSearchStore()
const {
  results,
} = storeToRefs(searchStore)
const { reset, addToSearchHistory } = searchStore

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n({ useScope: 'local' })
const { isMobileOrTablet } = useDevice()

const query = ref(Array.isArray(route.query.query) ? (route.query.query[0] ?? '') : (route.query.query ?? ''))
const limit = ref(3)
const currentSearch = ref((route.query.query || '').toString())
const isSuggestionsOpen = ref(false)
const suggestionsContent = ref(null)
const keepFocus = ref(false)
const highlighted = ref<string | undefined>(undefined)
const initialPage = parseInt(route.query.page as string) || 1
const currentPage = ref(initialPage)

const offset = computed({
  get: () => (currentPage.value - 1) * Number(limit.value),
  set: (val) => {
    offset.value = val
  },
})

const { data, execute, status, refresh } = await useAsyncData<SearchResponse>(
  'search',
  () => $fetch<SearchResponse>('/api/search', {
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
    onResponse({ response }) {
      if (!response.ok) {
        return
      }
      results.value = response._data
      if (!Object.values(response._data).every(value => !value)) {
        addToSearchHistory(query.value)
      }
      isSuggestionsOpen.value = false
    },
  }),
  {
    dedupe: 'cancel',
  },
)

async function loadMoreSectionResults(
  { lim, off }: { lim: number, off: number },
): Promise<void> {
  offset.value = off + lim
  await refresh()
}

const throttledSearch = useDebounceFn(async () => {
  await refresh()
}, 250)

const vFocus = {
  mounted: (el: HTMLElement) => el.focus(),
}

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

const total = computed(() => {
  if (!data.value) return 0

  let total = 0
  Object.entries(data.value).forEach(([_s, v]) => {
    if (v && v.estimatedTotalHits) {
      total += v.estimatedTotalHits
    }
  })
  return total
})

const size = computed(() => {
  if (isMobileOrTablet) return 'sm'
  return 'md'
})

const max = computed(() => {
  if (isMobileOrTablet) return 5
  return 10
})

watch(
  () => currentSearch.value,
  async (newVal) => {
    if (newVal.length < 3) return
    query.value = newVal
    await router.replace({
      query: {
        ...route.query,
        query: newVal,
        page: currentPage.value,
      },
    })
    await throttledSearch()
  },
)

watch(
  () => currentPage.value,
  async (newPage) => {
    await router.replace({
      query: {
        ...route.query,
        page: newPage,
      },
    })
    await execute()
  },
  {
    immediate: true,
  },
)

onClickOutside(suggestionsContent, () => {
  isSuggestionsOpen.value = false
})

onUnmounted(() => {
  currentSearch.value = ''
  isSuggestionsOpen.value = false
  reset()
})

onMounted(() => {
  isSuggestionsOpen.value = false
})

useSeoMeta({
  title: t('title'),
})
useHydratedHead({
  title: t('title'),
})

definePageMeta({
  layout: 'default',
})

await preloadComponents('SearchAutoComplete')
</script>

<template>
  <PageWrapper class="container flex flex-col gap-10 p-0">
    <PageTitle
      :text="t('title')"
      class="hidden text-center"
    />
    <PageBody>
      <div class="mt-10 grid">
        <div
          v-focus
          class="
            search-bar bg-primary-50

            dark:bg-primary-900

            fixed left-0 top-[48px] z-20 grid w-full items-center gap-4 p-[8px]

            md:top-[56px] md:p-[12px]

            lg:top-[63px]
          "
        >
          <div
            class="
              flex w-full items-center gap-2

              md:gap-4
            "
          >
            <Anchor
              :to="'index'"
              aria-label="index"
              class="
                back-to-home text-md text-primary-950 border-primary-500

                dark:text-primary-50 dark:border-primary-500

                flex items-center gap-3 overflow-hidden border-r-2 pr-2
                font-bold

                md:w-auto md:pr-8
              "
            >
              <span class="sr-only">{{ t('back_to_home') }}</span>
              <UIcon name="i-heroicons-arrow-left" />
            </Anchor>
            <UIcon
              name="i-fa-solid-magnifying-glass" class="
                text-lg

                md:text-base
              "
            />
            <label
              class="sr-only"
              for="search"
            >{{ t('placeholder') }}</label>
            <UInput
              id="search"
              v-model="currentSearch"
              v-focus
              :placeholder="t('placeholder')"
              class="w-full bg-transparent text-xl outline-none"
              type="text"
              variant="none"
              @click="isSuggestionsOpen = true"
              @keyup.enter="refresh"
            />
          </div>
        </div>
        <div class="grid gap-4">
          <PageTitle class="text-lg">
            <span :class="{ 'opacity-0': !query }">
              <span>{{ t('results') }}:</span>
              <span
                v-if="query"
                class="font-bold"
              >{{ query }}</span>
            </span>
          </PageTitle>
          <div class="grid gap-4">
            <UPagination
              v-show="hasResults"
              v-model="currentPage"
              :active-button="{
                color: 'secondary',
              }"
              :inactive-button="{
                color: 'primary',
              }"
              :first-button="{
                icon: 'i-heroicons-arrow-long-left-20-solid',
                label: !isMobileOrTablet ? $t('first') : undefined,
                color: 'primary',
              }"
              :last-button="{
                icon: 'i-heroicons-arrow-long-right-20-solid',
                trailing: true,
                label: !isMobileOrTablet ? $t('last') : undefined,
                color: 'primary',
              }"
              :prev-button="{
                icon: 'i-heroicons-arrow-small-left-20-solid',
                label: !isMobileOrTablet ? $t('prev') : undefined,
                color: 'primary',
              }"
              :next-button="{
                icon: 'i-heroicons-arrow-small-right-20-solid',
                trailing: true,
                label: !isMobileOrTablet ? $t('next') : undefined,
                color: 'primary',
              }"
              :total="total"
              :max="max"
              :disabled="!hasResults || status === 'pending'"
              :size="size"
              show-first
              show-last
            />
            <SearchAutoComplete
              v-model:keep-focus="keepFocus"
              v-model:highlighted="highlighted"
              class="relative"
              :query="query"
              :limit="limit"
              :offset="offset"
              :all-results="results"
              :status="status"
              :has-results="hasResults"
              :load-more="false"
              @load-more="loadMoreSectionResults"
            />
          </div>
        </div>
      </div>
    </PageBody>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Αναζήτηση
  placeholder: Αναζήτηση...
  results: Αποτέλεσμα αναζήτησης για
  back_to_home: Πίσω στην Αρχική
</i18n>
