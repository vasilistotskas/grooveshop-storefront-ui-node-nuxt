<script lang="ts" setup>
const searchStore = useSearchStore()
const {
  results,
} = storeToRefs(searchStore)
const { reset, addToSearchHistory } = searchStore

const route = useRoute()
const router = useRouter()
const { $i18n } = useNuxtApp()
const { t, locale } = useI18n({ useScope: 'local' })
const { isMobileOrTablet } = useDevice()
const localePath = useLocalePath()

const query = ref(Array.isArray(route.query.query) ? (route.query.query[0] ?? '') : (route.query.query ?? ''))
const limit = ref(3)
const currentSearch = ref((route.query.query || '').toString())
const isSuggestionsOpen = ref(false)
const suggestionsContent = ref(null)
const keepFocus = ref(false)
const highlighted = ref<string | undefined>(undefined)
const initialPage = parseInt(route.query.page as string) || 1
const currentPage = ref(initialPage)

const links = computed(() => [
  {
    to: localePath('index'),
    label: $i18n.t('breadcrumb.items.index.label'),
    icon: $i18n.t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('search'),
    label: t('breadcrumb.items.search.label'),
    icon: t('breadcrumb.items.search.icon'),
    current: true,
  },
])

const offset = computed({
  get: () => (currentPage.value - 1) * Number(limit.value),
  set: (val) => {
    offset.value = val
  },
})

const { data, status, refresh } = await useFetch<SearchResponse>(
  '/api/search',
  {
    key: `search${query.value}`,
    method: 'GET',
    headers: useRequestHeaders(),
    credentials: 'omit',
    retry: 120,
    retryDelay: 1000,
    dedupe: 'cancel',
    query: {
      query: query,
      language: locale,
      limit: limit,
      offset: offset,
    },
    onResponse({ response }) {
      if (!response.ok) {
        return
      }
      if (response && response._data) {
        results.value = response._data
        if (!Object.values(response._data).every(value => !value)) {
          addToSearchHistory(query.value)
        }
        isSuggestionsOpen.value = false
      }
    },
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
  () => currentSearch,
  async (newVal) => {
    if (newVal.value.length < 3) return
    query.value = newVal.value
    currentPage.value = 1
    await router.replace({
      query: {
        ...route.query,
        query: newVal.value,
      },
    })
    await throttledSearch()
  },
  {
    immediate: false,
    deep: true,
  },
)

watch(
  () => currentPage,
  async (newPage) => {
    await router.replace({
      query: {
        ...route.query,
        page: newPage.value,
      },
    })
  },
  {
    immediate: false,
    deep: true,
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
useHead({
  title: t('title'),
})

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="container flex flex-col gap-10 p-0">
    <PageTitle
      :text="t('title')"
      class="hidden text-center"
    />

    <div class="mt-10 grid">
      <div
        v-focus
        class="
            search-bar bg-primary-50 fixed left-0 top-[48px] z-20 grid w-full
            items-center gap-4 p-[8px]

            dark:bg-primary-900

            lg:top-[63px]

            md:top-[56px] md:p-[12px]
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
                back-to-home text-md text-primary-950 border-primary-500 flex
                items-center gap-3 overflow-hidden border-r-2 pr-2 font-bold

                dark:text-primary-50 dark:border-primary-500

                md:w-auto md:pr-8
              "
          >
            <span class="sr-only">{{ t('back_to_home') }}</span>
            <UIcon name="i-heroicons-arrow-left" />
          </Anchor>
          <UIcon
            name="i-heroicons-magnifying-glass" class="
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
      <div class="container-xs grid gap-4">
        <UBreadcrumb
          :links="links"
          :ui="{
            li: 'text-primary-950 dark:text-primary-50',
            base: 'text-xs md:text-md',
          }"
          class="
              !p-0 container-xs relative mt-5 min-w-0

              md:mb-5
            "
        />
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
              label: !isMobileOrTablet ? $i18n.t('first') : undefined,
              color: 'primary',
            }"
            :last-button="{
              icon: 'i-heroicons-arrow-long-right-20-solid',
              trailing: true,
              label: !isMobileOrTablet ? $i18n.t('last') : undefined,
              color: 'primary',
            }"
            :prev-button="{
              icon: 'i-heroicons-arrow-small-left-20-solid',
              label: !isMobileOrTablet ? $i18n.t('prev') : undefined,
              color: 'primary',
            }"
            :next-button="{
              icon: 'i-heroicons-arrow-small-right-20-solid',
              trailing: true,
              label: !isMobileOrTablet ? $i18n.t('next') : undefined,
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
            v-if="results"
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
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Αναζήτηση
  breadcrumb:
    items:
      search:
        label: Αναζήτηση
        icon: i-heroicons-magnifying-glass-circle
  placeholder: Αναζήτηση...
  results: Αποτέλεσμα αναζήτησης για
  back_to_home: Πίσω στην Αρχική
</i18n>
