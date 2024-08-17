<script lang="ts" setup>
import SearchingNoResultsJson from '~/assets/lotties/search_no_results.json'
import SearchingJson from '~/assets/lotties/searching.json'

const searchStore = useSearchStore()
const {
  results,
  searchHistory,
  totalCount,
  productSearchItems,
  blogPostSearchItems,
  productHeadlines,
  blogPostHeadlines,
} = storeToRefs(searchStore)
const { reset, addToSearchHistory, clearSearchHistory, clearSearchHistoryItem } = searchStore

const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const { cleanHtml } = useText()
const { isMobileOrTablet } = useDevice()

const currentSearch = ref((route.query.query || '').toString())
const suggestions = ref(null)
const isSuggestionsOpen = ref(false)
const suggestionsContent = ref(null)
const error = ref(null)
const pending = ref(false)

const searchRequest = async (query: string) => {
  pending.value = true
  try {
    await $fetch('/api/search', {
      method: 'GET',
      query: {
        query: query,
        language: locale.value,
      },
      onResponse({ response }) {
        if (!response.ok) {
          return
        }
        results.value = response._data
        if (!Object.values(response._data).every(value => !value)) {
          addToSearchHistory(query)
        }
      },
    })
  }
  catch (error) {
    console.error(error)
  }
  finally {
    pending.value = false
    isSuggestionsOpen.value = false
  }
}

if (currentSearch.value && currentSearch.value.length >= 3) {
  await searchRequest(currentSearch.value)
}

const throttledSearch = useDebounceFn(async () => {
  await searchRequest(currentSearch.value)
}, 250)

const vFocus = {
  mounted: (el: HTMLElement) => el.focus(),
}

const storageSearchHistory = computed(() => {
  const query = currentSearch.value.toLowerCase()
  return searchHistory.value.filter(
    (item: string) => item.toLowerCase().includes(query) && item !== query,
  )
})

const showSearchHistory = computed(() => storageSearchHistory.value.length > 0)
const showHeadlines = computed(() => Object.keys(productHeadlines).length > 0 || Object.keys(blogPostHeadlines).length > 0)
const showSuggestions = computed(() => isSuggestionsOpen.value && (showSearchHistory.value || showHeadlines.value))
const showResults = computed(() => (productSearchItems.value.length > 0 || blogPostSearchItems.value.length > 0) && !pending.value && !error.value)
const showStartSearching = computed(() => !currentSearch.value && !pending.value)
const showTotalCount = computed(() => totalCount.value > 0 && !pending.value)
const showIsSearching = computed(() => pending.value && !error.value)
const showNoResults = computed(() => !showIsSearching.value && productSearchItems.value.length === 0 && blogPostSearchItems.value.length === 0 && !error.value)

watch(
  () => currentSearch.value,
  (newVal) => {
    if (newVal.length < 3) return
    throttledSearch()
    router.replace({ query: { ...route.query, query: newVal } })
  },
)

const handleSearchEnter = async () => {
  await searchRequest(currentSearch.value)
}

const handleClearHistoryItem = (item: string) => {
  clearSearchHistoryItem(item)
}

const handleClearHistory = () => {
  clearSearchHistory()
}

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

definePageMeta({
  pageTransition: false,
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="container flex flex-col gap-10 p-0">
    <PageBody>
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
              :to="'/'"
              aria-label="index"
              class="
                back-to-home text-md text-primary-950 flex items-center gap-3
                overflow-hidden border-r-2 border-primary-500 pr-2 font-bold

                dark:text-primary-50 dark:border-primary-500

                md:w-auto md:pr-8
              "
            >
              <span class="sr-only">{{ $t('pages.search.back_to_home') }}</span>
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
            >{{ $t('pages.search.placeholder') }}</label>
            <UInput
              id="search"
              v-model="currentSearch"
              v-focus
              :placeholder="$t('pages.search.placeholder')"
              class="w-full bg-transparent text-xl outline-none"
              type="text"
              variant="none"
              @click="isSuggestionsOpen = true"
              @keyup.enter="handleSearchEnter"
            />
          </div>
          <div
            v-if="showSuggestions"
            ref="suggestions"
            class="
              suggestions absolute top-[45px] z-10 w-full list-none

              md:mt-2
            "
          >
            <div
              class="
                bg-primary-50 m-auto w-11/12 rounded-md shadow-md

                dark:bg-primary-900
              "
            >
              <div
                ref="suggestionsContent"
                class="suggestions-content max-h-36 overflow-y-auto"
              >
                <p
                  v-if="!currentSearch && storageSearchHistory.length > 0"
                  class="recent-searches flex items-center justify-between px-2"
                >
                  <span
                    class="
                      text-primary-950 text-sm

                      dark:text-primary-50
                    "
                  >{{ $t('common.search.recent') }}</span>
                  <UButton
                    :label="$t('common.search.clear_all')"
                    :size="isMobileOrTablet ? 'xs' : 'xs'"
                    :trailing="true"
                    color="rose"
                    icon="i-heroicons-x-mark"
                    variant="link"
                    @click="handleClearHistory"
                  />
                </p>
                <TransitionGroup
                  class="grid"
                  name="list"
                  tag="ul"
                >
                  <template
                    v-for="suggestion in storageSearchHistory"
                    :key="suggestion"
                  >
                    <li
                      class="
                        suggestion-item relative px-4 py-2

                        dark:hover:bg-primary-700

                        hover:bg-primary-50
                      "
                    >
                      <Anchor
                        :to="`/search?query=${suggestion}`"
                        class="flex items-center gap-3"
                        @click="() => { currentSearch = suggestion; isSuggestionsOpen = false; }"
                      >
                        <UIcon
                          name="i-fa6-solid-clock-rotate-left" class="text-sm"
                        />
                        <span
                          class="
                            text-primary-950 truncate text-sm

                            dark:text-primary-50
                          "
                        >{{ suggestion }}</span>
                      </Anchor>
                      <UButton
                        :label="$t('common.clear')"
                        :size="isMobileOrTablet ? 'xs' : 'xs'"
                        :trailing="true"
                        class="absolute right-0 top-0"
                        color="rose"
                        icon="i-heroicons-x-mark"
                        variant="link"
                        @click="handleClearHistoryItem(suggestion)"
                      />
                    </li>
                  </template>
                  <li
                    v-for="(headline, productId) in productHeadlines"
                    :key="productId"
                    class="
                      headline-item px-4 py-2

                      dark:hover:bg-primary-700

                      hover:bg-primary-50
                    "
                  >
                    <Anchor
                      :to="`/search?query=${cleanHtml(headline)}`"
                      class="flex items-center gap-3"
                      @click="() => { currentSearch = cleanHtml(headline); isSuggestionsOpen = false; }"
                    >
                      <UIcon name="i-fa6-solid-magnifying-glass" class="text-sm" />
                      <span
                        class="
                          text-primary-950 truncate text-sm

                          dark:text-primary-50
                        "
                        v-html="headline"
                      />
                    </Anchor>
                  </li>
                  <li
                    v-for="(headline, blogPostId) in blogPostHeadlines"
                    :key="blogPostId"
                    class="
                      headline-item px-4 py-2

                      dark:hover:bg-primary-700

                      hover:bg-primary-50
                    "
                  >
                    <Anchor
                      :to="`/search?query=${cleanHtml(headline)}`"
                      class="flex items-center gap-3"
                      @click="() => { currentSearch = cleanHtml(headline); isSuggestionsOpen = false; }"
                    >
                      <UIcon name="i-fa6-solid-magnifying-glass" class="text-sm" />
                      <span
                        class="
                          text-primary-950 truncate text-sm

                          dark:text-primary-50
                        "
                        v-html="headline"
                      />
                    </Anchor>
                  </li>
                </TransitionGroup>
              </div>
            </div>
          </div>
        </div>
        <PageTitle class="sr-only">
          <span :class="{ 'opacity-0': !currentSearch }">
            <span>{{ $t('pages.search.results') }}:</span>
            <span
              v-if="currentSearch"
              class="font-bold"
            >{{ currentSearch }}</span>
          </span>
        </PageTitle>
        <div
          v-if="showResults"
          class="
            results mt-14 min-h-screen

            md:mt-14
          "
        >
          <div
            v-if="showTotalCount"
            class="total-count pb-2 text-sm opacity-95"
          >
            {{ $t('common.items.count', totalCount) }}
          </div>
          <div
            class="
              results-grid grid grid-cols-1 gap-4

              lg:grid-cols-3

              md:grid-cols-2

              xl:grid-cols-4
            "
          >
            <SearchProductCard
              v-for="(item, index) in productSearchItems"
              :key="index"
              :item="item"
            />
            <SearchBlogPostCard
              v-for="(item, index) in blogPostSearchItems"
              :key="index"
              :item="item"
            />
          </div>
        </div>
        <div
          v-if="showStartSearching"
          class="
            start-searching p-2 text-center text-xl font-light opacity-50

            md:p-4 md:text-4xl
          "
        >
          {{ $t('pages.search.start_searching') }}
        </div>
        <div
          v-if="showIsSearching"
          class="
            is-searching mb-20 mt-20 grid animate-pulse items-center
            justify-center
          "
        >
          <LazyLottie
            :animation-data="SearchingJson"
            :height="'254px'"
            :width="'254px'"
            class="grid"
          />
        </div>
        <div
          v-if="showNoResults"
          class="
            no-results mb-16 mt-16 grid items-center justify-center

            md:mb-20 md:mt-20
          "
        >
          <LazyLottie
            :animation-data="SearchingNoResultsJson"
            :height="'254px'"
            :width="'254px'"
            class="grid"
          />
        </div>
      </div>
    </PageBody>
  </PageWrapper>
</template>
