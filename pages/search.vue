<script lang="ts" setup>
import SearchingNoResultsJson from '~/assets/lotties/search_no_results.json'
import SearchingJson from '~/assets/lotties/searching.json'

const searchStore = useSearchStore()
const { results, storage, totalCount, productSearchItems, productHeadlines } =
  storeToRefs(searchStore)
const { reset } = searchStore

const route = useRoute('search___en')
const router = useRouter()
const { locale } = useI18n()
const { cleanHtml } = useText()

const currentSearch = ref((route.query.query || '').toString())
const suggestions = ref(null)
const isSuggestionsOpen = ref(false)

const { pending, error, refresh } = await useAsyncData(
  'search',
  () =>
    // @ts-expect-error
    $fetch('/api/search', {
      method: 'GET',
      query: {
        query: currentSearch.value,
        language: locale.value,
      },
      onResponse({ response }) {
        results.value = response._data
        isSuggestionsOpen.value = false
      },
    }),
  {
    immediate: false,
  },
)

onClickOutside(suggestions, () => {
  isSuggestionsOpen.value = false
})

const throttledSearch = useDebounceFn(async () => {
  await refresh()
}, 250)

const vFocus = {
  mounted: (el: HTMLElement) => el.focus(),
}

const storageSearchHistory = computed(() => {
  const query = currentSearch.value.toLowerCase()
  return storage.value.filter(
    (item: string) => item.toLowerCase().includes(query) && item !== query,
  )
})

const showSearchHistory = computed(() => {
  return storageSearchHistory.value.length > 0
})

const showHeadlines = computed(() => {
  return Object.keys(productHeadlines).length > 0
})

const showSuggestions = computed(() => {
  return (
    isSuggestionsOpen.value && (showSearchHistory.value || showHeadlines.value)
  )
})

const showResults = computed(() => {
  return productSearchItems.value.length > 0 && !pending.value && !error.value
})

const showStartSearching = computed(() => {
  return !currentSearch.value && !pending.value
})

const showTotalCount = computed(() => {
  return totalCount.value > 0 && !pending.value
})

const showIsSearching = computed(() => {
  return pending.value && !error.value
})

const showNoResults = computed(() => {
  return (
    !showIsSearching.value &&
    productSearchItems.value.length === 0 &&
    !error.value
  )
})

watch(
  () => currentSearch.value,
  () => {
    pending.value = true
    isSuggestionsOpen.value = false
    if (currentSearch.value.length < 3) return
    throttledSearch()
    router.replace({
      query: {
        ...route.query,
        query: currentSearch.value,
      },
    })
  },
)

onUnmounted(() => {
  currentSearch.value = ''
  isSuggestionsOpen.value = false
  reset()
})

onMounted(() => {
  isSuggestionsOpen.value = false
})

definePageMeta({
  pageTransition: false,
})

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="container flex flex-col gap-10 p-0">
    <PageBody>
      <div
        v-focus
        class="fixed left-0 top-0 z-20 grid w-full items-center gap-4 bg-zinc-50 p-[22px] dark:bg-zinc-900 md:p-[17px]"
      >
        <div class="flex w-full items-center gap-4">
          <Anchor
            :to="'index'"
            aria-label="index"
            class="text-md text-primary-800 dark:text-primary-100 flex items-center gap-3 overflow-hidden border-r-2 border-gray-900/10 pr-8 font-bold dark:border-gray-50/20 md:w-auto"
          >
            <span class="sr-only">{{ $t('pages.search.back_to_home') }}</span>
            <UIcon name="i-heroicons-arrow-left" />
          </Anchor>
          <IconFa6Solid:magnifyingGlass />
          <label for="search" class="sr-only">{{
            $t('pages.search.placeholder')
          }}</label>
          <input
            id="search"
            v-model="currentSearch"
            v-focus
            type="text"
            class="w-full bg-transparent text-xl outline-none"
            :placeholder="$t('pages.search.placeholder')"
            @keyup.enter="refresh()"
            @click="isSuggestionsOpen = true"
          >
        </div>
        <div
          v-if="showSuggestions"
          ref="suggestions"
          class="absolute top-14 z-10 mt-1 max-h-36 w-full list-none overflow-y-auto rounded-md bg-zinc-50 shadow-md dark:bg-zinc-900"
        >
          <TransitionGroup name="list" tag="ul" class="grid">
            <li
              v-for="suggestion in storageSearchHistory"
              :key="suggestion"
              class="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            >
              <Anchor
                :to="`/search?query=${suggestion}`"
                class="flex items-center gap-3"
                @click="currentSearch = suggestion"
              >
                <IconFa6Solid:clockRotateLeft />
                <span
                  class="text-primary-800 dark:text-primary-100 truncate font-bold"
                >
                  {{ suggestion }}
                </span>
              </Anchor>
            </li>
            <li
              v-for="(headline, productId) in productHeadlines"
              :key="productId"
              class="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            >
              <Anchor
                :to="`/search?query=${cleanHtml(headline)}`"
                class="flex items-center gap-3"
                @click="currentSearch = cleanHtml(headline)"
              >
                <IconFa6Solid:magnifyingGlass />
                <span
                  class="text-primary-800 dark:text-primary-100 truncate font-bold"
                  v-html="headline"
                />
              </Anchor>
            </li>
          </TransitionGroup>
        </div>
      </div>
      <PageTitle class="sr-only">
        <span
          :class="{
            'opacity-0': !currentSearch,
          }"
        >
          <span>{{ $t('pages.search.results') }}:</span>
          <span v-if="currentSearch" class="font-bold">
            {{ currentSearch }}</span
          >
        </span>
      </PageTitle>

      <div v-if="showResults" class="min-h-screen md:mt-4">
        <div v-if="showTotalCount" class="pb-2 text-sm opacity-95">
          {{ $t('common.items.count', totalCount) }}
        </div>
        <div
          class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <SearchProductCard
            v-for="(item, index) of productSearchItems"
            :key="index"
            :item="item"
          />
        </div>
      </div>
      <div
        v-if="showStartSearching"
        class="p-10 text-center text-4xl font-light opacity-50"
      >
        {{ $t('pages.search.start_searching') }}
      </div>
      <div
        v-if="showIsSearching"
        class="mb-20 mt-20 grid animate-pulse items-center justify-center"
      >
        <LazyLottie
          class="grid"
          :animation-data="SearchingJson"
          :width="'254px'"
          :height="'254px'"
        />
      </div>
      <div v-if="showNoResults" class="mt-40 grid items-center justify-center">
        <LazyLottie
          class="grid"
          :animation-data="SearchingNoResultsJson"
          :width="'254px'"
          :height="'254px'"
        />
      </div>
    </PageBody>
  </PageWrapper>
</template>
