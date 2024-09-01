<script lang="ts" setup>
import SearchingNoResultsJson from '~/assets/lotties/search_no_results.json'
import SearchingJson from '~/assets/lotties/searching.json'

const searchStore = useSearchStore()
const {
  results,
  totalCount,
  productSearchItems,
  blogPostSearchItems,
} = storeToRefs(searchStore)
const { reset, addToSearchHistory } = searchStore

const route = useRoute()
const router = useRouter()
const { locale } = useI18n()

const currentSearch = ref((route.query.query || '').toString())
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
  <PageWrapper class="container-sm flex flex-col gap-10 p-0">
    <PageBody>
      <div class="grid">
        <PageTitle>
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
          class="results mt-4 min-h-screen"
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
