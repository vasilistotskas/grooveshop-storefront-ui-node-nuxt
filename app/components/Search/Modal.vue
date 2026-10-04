<script lang="ts" setup>
/**
 * The search palette: products and guides as the shopper types, their
 * recent searches beside them, and "see all" for the full results page.
 *
 * A `UCommandPalette` in a modal. The palette's own filter is off
 * (`ignoreFilter`): the matches are the search engine's, asked for 200 ms
 * after the last keystroke and only from two characters. Before that the
 * palette offers the shopper's recent searches and what the shop is
 * searching for.
 *
 * A result opens its page (the item is a link) and reports its rank among
 * its own list. A product's category and "was" price are not shown: a
 * search hit carries neither.
 */
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
const { t, n, locale } = useI18n()
const localePath = useLocalePath()
const { productUrl, blogPostUrl } = useUrls()
const history = useSearchHistory()
const { trackResultClick } = useSearchClickTracking()

const MIN_QUERY_LENGTH = 2

const MODAL_UI = { content: 'max-w-2xl rounded-[1.25rem] max-md:rounded-none' }

const trending = useLazyApi<{
  windowHours: number
  contentType: string
  languageCode: string | null
  results: { query: string, count: number }[]
}>('/api/search/trending', {
  query: { languageCode: locale, contentType: 'product', limit: 8 },
  immediate: true,
  server: false,
  default: () => ({ windowHours: 24, contentType: 'product', languageCode: null, results: [] }),
})

const localQuery = computed({
  get: () => props.query,
  set: value => emit('update:query', value),
})

const localOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value),
})

const debouncedQuery = refDebounced(localQuery, 200)

const { data: searchResults, status, execute } = useLazyApi<SearchResponse>('/api/search', {
  query: {
    query: debouncedQuery,
    languageCode: locale,
    limit: 3,
    offset: 0,
  },
  immediate: false,
  watch: false,
})

const products = ref<ProductMeiliSearchResult[]>([])
const guides = ref<BlogPostMeiliSearchResult[]>([])

const searching = computed(() => localQuery.value.length >= MIN_QUERY_LENGTH)

watch(debouncedQuery, (next) => {
  products.value = []
  guides.value = []
  if (next && next.length >= MIN_QUERY_LENGTH) execute()
})

watch(searchResults, (next) => {
  if (!next) return
  products.value = next.products?.results ?? []
  guides.value = next.blogPosts?.results ?? []
}, { deep: true })

// Open on a query the parent already holds (the search page's own field).
if (searching.value) execute()

const totalResults = computed(() =>
  (searchResults.value?.products?.estimatedTotalHits ?? 0)
  + (searchResults.value?.blogPosts?.estimatedTotalHits ?? 0),
)

// The engine relaxes a query that found nothing; say what it searched for.
const relaxedQuery = computed(() =>
  searchResults.value?.products?.relaxedQuery ?? searchResults.value?.blogPosts?.relaxedQuery ?? null,
)

function close() {
  localOpen.value = false
}

function applyQuery(query: string) {
  emit('update:query', query)
}

function onResultClick(result: SearchResult, rank: number) {
  const isProduct = result.contentType === 'product'
  history.add(localQuery.value)
  trackResultClick({
    queryId: isProduct
      ? searchResults.value?.products?.queryId
      : searchResults.value?.blogPosts?.queryId,
    resultId: result.master,
    resultType: isProduct ? 'product' : 'blog_post',
    position: rank,
  })
  close()
}

function goToSearchPage() {
  if (!localQuery.value) return
  history.add(localQuery.value)
  router.replace({ path: '/search', query: { query: localQuery.value } })
  close()
}

const groups = computed(() => {
  const result = []

  if (searching.value) {
    if (products.value.length) {
      result.push({
        id: 'products',
        label: t('groups.products'),
        ignoreFilter: true,
        items: products.value.map((product, rank) => ({
          id: `product-${product.id}`,
          label: getDisplayTitle(product),
          slot: 'product' as const,
          product,
          to: localePath(productUrl(product.master, product.slug)),
          onSelect: () => onResultClick(product, rank),
        })),
      })
    }
    if (guides.value.length) {
      result.push({
        id: 'guides',
        label: t('groups.guides'),
        ignoreFilter: true,
        items: guides.value.map((post, rank) => ({
          id: `guide-${post.id}`,
          label: getDisplayTitle(post),
          slot: 'guide' as const,
          to: localePath(blogPostUrl(post.master, post.slug)),
          onSelect: () => onResultClick(post, rank),
        })),
      })
    }
  }

  if (history.entries.value.length) {
    result.push({
      id: 'recent',
      label: t('groups.recent'),
      ignoreFilter: true,
      items: history.entries.value.map(entry => ({
        id: `recent-${entry}`,
        label: entry,
        icon: 'i-lucide-clock',
        onSelect: () => applyQuery(entry),
      })),
    })
  }

  if (!searching.value && trending.data.value?.results.length) {
    result.push({
      id: 'trending',
      label: t('groups.trending'),
      ignoreFilter: true,
      items: trending.data.value.results.map(entry => ({
        id: `trending-${entry.query}`,
        label: entry.query,
        icon: 'i-lucide-flame',
        onSelect: () => applyQuery(entry.query),
      })),
    })
  }

  return result
})

const noResults = computed(() =>
  searching.value && !!searchResults.value && status.value !== 'pending'
  && !products.value.length && !guides.value.length,
)
</script>

<template>
  <UModal
    v-model:open="localOpen"
    :title="t('title')"
    :description="t('description')"
    :fullscreen="isMobileOrTablet"
    :ui="MODAL_UI"
  >
    <template #content>
      <UCommandPalette
        v-model:search-term="localQuery"
        :groups="groups"
        :loading="status === 'pending'"
        :placeholder="t('placeholder')"
        :close="isMobileOrTablet"
        :ui="{ input: '[&>input]:h-14 [&>input]:text-base' }"
        class="max-md:h-dvh md:h-auto md:max-h-[80vh]"
        @update:open="(value: boolean) => { localOpen = value }"
      >
        <template #product-leading="{ item }">
          <span class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-elevated">
            <ImgWithFallback
              v-if="item.product.mainImagePath"
              :src="item.product.mainImagePath"
              alt=""
              :width="96"
              :height="96"
              fit="contain"
              loading="lazy"
              class="size-full object-contain"
            />
            <UIcon
              v-else
              name="i-lucide-package"
              class="size-5 text-muted"
            />
          </span>
        </template>

        <template #product-label="{ item }">
          <span class="line-clamp-2 font-medium text-highlighted">
            <template
              v-for="(part, index) in highlightSegments(item.label ?? '', localQuery)"
              :key="index"
            >
              <mark
                v-if="part.match"
                class="rounded-xs bg-(--ui-volt-soft) text-highlighted"
              >{{ part.text }}</mark>
              <template v-else>{{ part.text }}</template>
            </template>
          </span>
        </template>

        <template #product-trailing="{ item }">
          <span class="flex shrink-0 flex-col items-end gap-0.5">
            <span
              v-if="item.product.finalPrice !== null"
              class="font-mono text-sm font-semibold text-highlighted"
            >
              {{ n(item.product.finalPrice, 'currency') }}
            </span>
            <span
              v-if="(item.product.discountPercent ?? 0) > 0"
              class="rounded-full bg-volt px-1.5 py-0.5 font-mono text-[0.6875rem] font-semibold text-on-volt"
            >
              −{{ Math.round(item.product.discountPercent ?? 0) }}%
            </span>
          </span>
        </template>

        <template #guide-leading>
          <UIcon
            name="i-lucide-file-text"
            class="size-5 shrink-0 text-muted"
          />
        </template>

        <template #guide-label="{ item }">
          <span class="line-clamp-2 font-medium text-highlighted">
            <template
              v-for="(part, index) in highlightSegments(item.label ?? '', localQuery)"
              :key="index"
            >
              <mark
                v-if="part.match"
                class="rounded-xs bg-(--ui-volt-soft) text-highlighted"
              >{{ part.text }}</mark>
              <template v-else>{{ part.text }}</template>
            </template>
          </span>
        </template>

        <template #empty>
          <div class="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <UIcon
              name="i-lucide-search-x"
              class="size-8 text-muted"
            />
            <p class="font-medium text-highlighted">
              {{ noResults ? t('no_results') : t('start_typing') }}
            </p>
            <p
              v-if="noResults"
              class="text-sm text-toned"
            >
              {{ t('try_different') }}
            </p>
          </div>
        </template>

        <template #footer>
          <div class="flex w-full flex-col gap-2">
            <p
              v-if="noResults && groups.length"
              role="status"
              class="text-sm font-medium text-highlighted"
            >
              {{ t('no_results') }}
            </p>
            <p
              v-if="relaxedQuery"
              role="status"
              class="flex items-center gap-1.5 text-xs text-toned"
            >
              <UIcon
                name="i-lucide-info"
                class="size-3.5 shrink-0"
              />
              {{ t('relaxed_notice', { query: relaxedQuery }) }}
            </p>
            <div class="flex w-full items-center justify-between gap-3">
              <UButton
                v-if="localQuery && totalResults > 0"
                :label="t('see_all', { count: n(totalResults) }, totalResults)"
                color="neutral"
                variant="link"
                class="px-0"
                @click="goToSearchPage"
              />
              <span v-else />
              <span
                v-if="!isMobileOrTablet"
                class="flex items-center gap-1.5 text-xs text-muted"
              >
                <UKbd value="arrowup" />
                <UKbd value="arrowdown" />
                {{ t('to_navigate') }}
              </span>
            </div>
          </div>
        </template>
      </UCommandPalette>
    </template>
  </UModal>
</template>

<i18n lang="yaml">
el:
  title: Αναζήτηση
  description: Αναζήτηση στο κατάστημα
  placeholder: Αναζήτηση στο κατάστημα
  groups:
    products: Προϊόντα
    guides: Οδηγοί
    recent: Πρόσφατες αναζητήσεις
    trending: Δημοφιλείς αναζητήσεις
  start_typing: Ξεκίνα να πληκτρολογείς για αναζήτηση
  no_results: Δεν βρέθηκαν αποτελέσματα
  try_different: Δοκίμασε διαφορετικούς όρους αναζήτησης
  relaxed_notice: Εμφανίζονται αποτελέσματα για "{query}"
  see_all: "Δες το αποτέλεσμα | Δες και τα {count} αποτελέσματα"
  to_navigate: για πλοήγηση
en:
  title: Search
  description: Search the shop
  placeholder: Search the shop
  groups:
    products: Products
    guides: Guides
    recent: Recent searches
    trending: Trending searches
  start_typing: Start typing to search
  no_results: No results found
  try_different: Try different search terms
  relaxed_notice: Showing results for "{query}"
  see_all: "See the result | See all {count} results"
  to_navigate: to navigate
</i18n>
