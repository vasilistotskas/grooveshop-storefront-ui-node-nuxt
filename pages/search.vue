<script lang="ts" setup>
import SearchingJson from '~/assets/lotties/searching.json'
import SearchingNoResultsJson from '~/assets/lotties/search_no_results.json'

const searchStore = useSearchStore()
const { storage, pending, error, totalCount, productSearchItems, productHeadlines } =
	storeToRefs(searchStore)
const { search, reset } = searchStore

const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const { cleanHtml } = useText()

const currentSearch = ref((route.query.query || '').toString())
const suggestions = ref(null)
const isSuggestionsOpen = ref(false)

onClickOutside(suggestions, () => {
	isSuggestionsOpen.value = false
})

await search({
	query: currentSearch.value,
	language: locale.value
})

const refreshSearch = async () => {
	await search({
		query: currentSearch.value,
		language: locale.value
	})
	await navigateTo({
		path: '/search',
		query: {
			query: currentSearch.value
		}
	})
}

const throttledSearch = useDebounceFn(refreshSearch, 250)

const vFocus = {
	mounted: (el: HTMLElement) => el.focus()
}

const storageSearchHistory = computed(() => {
	const query = currentSearch.value.toLowerCase()
	return storage.value.filter(
		(item: string) => item.toLowerCase().includes(query) && item !== query
	)
})

const showSearchHistory = computed(() => {
	return storageSearchHistory.value.length > 0
})

const showHeadlines = computed(() => {
	return Object.keys(productHeadlines).length > 0
})

const showSuggestions = computed(() => {
	return isSuggestionsOpen.value && (showSearchHistory.value || showHeadlines.value)
})

const showResults = computed(() => {
	return (
		productSearchItems.value.length > 0 && !pending.value.results && !error.value.results
	)
})

const showStartSearching = computed(() => {
	return !currentSearch.value && !pending.value.results
})

const showTotalCount = computed(() => {
	return totalCount.value > 0 && !pending.value.results
})

const showIsSearching = computed(() => {
	return pending.value.results && !error.value.results
})

const showNoResults = computed(() => {
	return (
		!showIsSearching.value &&
		productSearchItems.value.length === 0 &&
		!error.value.results
	)
})

const showErrors = computed(() => {
	return error.value.results
})

watch(
	() => currentSearch.value,
	() => {
		pending.value.results = true
		isSuggestionsOpen.value = false
		throttledSearch()
		router.replace({
			query: {
				...route.query,
				query: currentSearch.value
			}
		})
	}
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
	pageTransition: false
})

definePageMeta({
	layout: 'default'
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-10 p-0">
		<PageBody>
			<div
				v-focus
				class="grid bg-zinc-50 dark:bg-zinc-800 items-center gap-4 w-full fixed top-0 z-20 left-0 p-[17px]"
			>
				<div class="flex items-center gap-4 w-full">
					<Anchor
						:to="'index'"
						aria-label="index"
						class="flex items-center gap-3 overflow-hidden md:w-auto text-md font-bold text-primary-700 dark:text-primary-100 border-r-2 border-gray-900/10 dark:border-gray-50/20 pr-8"
					>
						<span class="sr-only">{{ $t('pages.search.back_to_home') }}</span>
						<UIcon name="i-heroicons-arrow-left" />
					</Anchor>
					<IconFa6Solid:magnifyingGlass />
					<label for="search" class="sr-only">{{ $t('pages.search.placeholder') }}</label>
					<input
						id="search"
						v-model="currentSearch"
						v-focus
						type="text"
						class="text-xl bg-transparent outline-none w-full"
						:placeholder="$t('pages.search.placeholder')"
						@keyup.enter="refreshSearch"
						@click="isSuggestionsOpen = true"
					/>
				</div>
				<div
					v-if="showSuggestions"
					ref="suggestions"
					class="absolute top-14 w-full mt-1 list-none max-h-36 overflow-y-auto z-10 rounded-md shadow-md bg-zinc-50 dark:bg-zinc-800"
				>
					<TransitionGroup name="list" tag="ul" class="grid">
						<li
							v-for="suggestion in storageSearchHistory"
							:key="suggestion"
							class="py-2 px-4 hover:bg-zinc-100 dark:hover:bg-zinc-700"
						>
							<Anchor
								:to="`/search?query=${suggestion}`"
								class="flex items-center gap-3"
								@click="currentSearch = suggestion"
							>
								<IconFa6Solid:clockRotateLeft />
								<span class="text-primary-700 dark:text-primary-100 font-bold truncate">
									{{ suggestion }}
								</span>
							</Anchor>
						</li>
						<li
							v-for="(headline, productId) in productHeadlines"
							:key="productId"
							class="py-2 px-4 hover:bg-zinc-100 dark:hover:bg-zinc-700"
						>
							<Anchor
								:to="`/search?query=${cleanHtml(headline)}`"
								class="flex items-center gap-3"
								@click="currentSearch = cleanHtml(headline)"
							>
								<IconFa6Solid:magnifyingGlass />
								<!-- eslint-disable vue/no-v-html -->
								<span
									class="text-primary-700 dark:text-primary-100 font-bold truncate"
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
						'opacity-0': !currentSearch
					}"
				>
					<span>{{ $t('pages.search.results') }}:</span>
					<span v-if="currentSearch" class="font-bold"> {{ currentSearch }}</span>
				</span>
			</PageTitle>

			<div v-if="showResults" class="min-h-screen mt-20">
				<div v-if="showTotalCount" class="px-8 text-sm opacity-95">
					{{ $t('common.items.count', totalCount) }}
				</div>
				<div
					class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-8"
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
				class="text-4xl p-10 font-light opacity-50 text-center"
			>
				{{ $t('pages.search.start_searching') }}
			</div>
			<div
				v-if="showIsSearching"
				class="animate-pulse grid items-center justify-center mt-20 mb-20"
			>
				<LazyLottie
					class="grid"
					:animation-data="SearchingJson"
					:width="'254px'"
					:height="'254px'"
				/>
			</div>
			<div v-if="showNoResults" class="grid items-center justify-center mt-40">
				<LazyLottie
					class="grid"
					:animation-data="SearchingNoResultsJson"
					:width="'254px'"
					:height="'254px'"
				/>
			</div>
			<div v-if="showErrors" class="p-8 flex flex-col gap-3 items-start mt-40">
				<h1 class="text-4xl text-red-600">
					{{ $t('pages.search.error') }}
				</h1>
				<pre class="py-2">{{ error.results }}</pre>
			</div>
		</PageBody>
	</PageWrapper>
</template>
