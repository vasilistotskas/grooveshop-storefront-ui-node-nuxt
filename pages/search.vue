<script lang="ts" setup>
import SearchingJson from '~/assets/lotties/searching.json'
import SearchingNoResultsJson from '~/assets/lotties/search_no_results.json'

definePageMeta({
	pageTransition: false
})

const route = useRoute()
const router = useRouter()
const searchStore = useSearchStore()
const { locale } = useLang()
const { cleanHtml } = useText()

const currentSearch = ref((route.query.query || '').toString())
const suggestions = ref(null)
const isSuggestionsOpen = ref(false)

const {
	totalCount,
	productSearchItems,
	productHeadlines,
	storage,
	pending: searchPending,
	error: searchError
} = storeToRefs(searchStore)

onClickOutside(suggestions, () => {
	isSuggestionsOpen.value = false
})

async function search() {
	searchPending.value.results = true
	await searchStore.search({
		query: currentSearch.value,
		language: locale.value
	})
}

await search()

const throttledSearch = useDebounceFn(search, 250)

const vFocus = {
	mounted: (el: HTMLElement) => el.focus()
}

const storageSearchHistory = computed(() => {
	const query = currentSearch.value.toLowerCase()
	return storage.value.filter(
		(item) => item.toLowerCase().includes(query) && item !== query
	)
})

const showSearchHistory = computed(() => {
	return storageSearchHistory.value.length > 0
})

const showHeadlines = computed(() => {
	return Object.keys(productHeadlines.value).length > 0
})

const showSuggestions = computed(() => {
	return isSuggestionsOpen.value && (showSearchHistory.value || showHeadlines.value)
})

const showResults = computed(() => {
	return (
		productSearchItems.value.length > 0 &&
		!searchPending.value.results &&
		!searchError.value.results
	)
})

const showStartSearching = computed(() => {
	return !currentSearch.value && !searchPending.value.results
})

const showTotalCount = computed(() => {
	return totalCount.value > 0 && !searchPending.value.results
})

const showIsSearching = computed(() => {
	return searchPending.value.results && !searchError.value.results
})

const showNoResults = computed(() => {
	return (
		!showIsSearching.value &&
		productSearchItems.value.length === 0 &&
		!searchError.value.results
	)
})

const showErrors = computed(() => {
	return searchError.value.results
})

watch(
	() => currentSearch.value,
	() => {
		searchPending.value.results = true
		isSuggestionsOpen.value = false
		throttledSearch()
		// 	replace router params
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
	searchStore.reset()
})

onMounted(() => {
	isSuggestionsOpen.value = false
})
</script>

<template>
	<PageWrapper class="container flex flex-col gap-40 p-0">
		<PageBody>
			<div
				id="search"
				v-focus
				class="grid bg-gray-50 dark:bg-gray-800 items-center p-4 gap-4 w-full fixed top-0 z-10 left-0"
			>
				<div class="flex items-center gap-4 w-full">
					<Anchor
						:to="'index'"
						aria-label="index"
						class="flex items-center gap-3 overflow-hidden md:w-auto text-md font-bold text-gray-700 dark:text-gray-200 border-r-2 border-gray-900/10 dark:border-gray-50/[0.2] close"
					>
						<span class="hidden">{{ $t('pages.search.back_to_home') }}</span>
						<IconEntypo:arrowLeft></IconEntypo:arrowLeft>
					</Anchor>
					<IconFa6Solid:magnifyingGlass />
					<input
						v-model="currentSearch"
						v-focus
						type="text"
						class="text-xl bg-transparent outline-none w-full"
						:placeholder="$t('pages.search.placeholder')"
						@keyup.enter="search"
						@click="isSuggestionsOpen = true"
					/>
				</div>
				<div
					v-if="showSuggestions"
					ref="suggestions"
					class="suggestions bg-gray-50/50 dark:bg-gray-800/90"
				>
					<TransitionGroup name="list" tag="ul" class="grid">
						<li
							v-for="suggestion in storageSearchHistory"
							:key="suggestion"
							class="suggestions-link hover:bg-gray-100 dark:hover:bg-gray-700"
						>
							<Anchor
								:to="`/search?query=${suggestion}`"
								class="suggestions-link-anchor flex items-center gap-3"
								@click="currentSearch = suggestion"
							>
								<IconFa6Solid:clockRotateLeft />
								<span class="text-gray-700 dark:text-gray-200">
									{{ suggestion }}
								</span>
							</Anchor>
						</li>
						<li
							v-for="(headline, productId) in productHeadlines"
							:key="productId"
							class="suggestions-link hover:bg-gray-100 dark:hover:bg-gray-700"
						>
							<Anchor
								:to="`/search?query=${cleanHtml(headline)}`"
								class="suggestions-link-anchor flex items-center gap-3"
								@click="currentSearch = cleanHtml(headline)"
							>
								<IconFa6Solid:magnifyingGlass />
								<!-- eslint-disable vue/no-v-html -->
								<span
									class="text-gray-700 dark:text-gray-200 headline"
									v-html="headline"
								/>
							</Anchor>
						</li>
					</TransitionGroup>
				</div>
			</div>
			<PageTitle class="hidden">
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
				<div v-if="showTotalCount" class="px-8 opacity-95 text-sm">
					{{ $t('common.items.count') }} : {{ totalCount }}
				</div>
				<div class="grid grid-cols-repeat-auto-fill-mimax-200-auto gap-4 p-8">
					<SearchProductCard
						v-for="(item, index) of productSearchItems"
						:key="index"
						:item="item"
					/>
				</div>
			</div>
			<div v-if="showStartSearching" class="text-4xl p10 font-100 op50 text-center">
				{{ $t('pages.search.start_searching') }}
			</div>
			<div
				v-if="showIsSearching"
				class="animate-pulse grid items-center justify-center mt-40"
			>
				<Lottie
					class="grid"
					:animation-data="SearchingJson"
					:width="'350px'"
					:height="'350px'"
				/>
			</div>
			<div v-if="showNoResults" class="grid items-center justify-center mt-40">
				<Lottie
					class="grid"
					:animation-data="SearchingNoResultsJson"
					:width="'350px'"
					:height="'350px'"
				/>
			</div>
			<div v-if="showErrors" class="p-8 flex flex-col gap-3 items-start mt-40">
				<h1 class="text-4xl text-red">
					{{ $t('pages.search.error') }}
				</h1>
				<pre class="py-2">{{ searchError.results }}</pre>
			</div>
		</PageBody>
	</PageWrapper>
</template>

<style lang="scss" scoped>
$transitional-profile-1: all 0.2s ease-out;

.close {
	margin-right: 2rem;
	z-index: 33;
	transition: $transitional-profile-1;

	span {
		i {
			font-weight: 900;
		}
	}
}
.suggestions {
	position: absolute;
	top: 3.75rem;
	list-style-type: none;
	max-height: 150px;
	overflow-y: auto;
	width: 100%;
	margin: 0;
	padding: 0;
	z-index: 10;
	border-radius: 4px;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

	&-link {
		min-height: 0;
		padding: 0;
		&-anchor {
			padding: 8px 16px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			color: inherit;
			font-weight: bold;
		}
	}
}
.headline {
	font-weight: 300;
	::v-deep(span) {
		font-weight: 900;
	}
}
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

.list-enter-active,
.list-leave-active {
	transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
	opacity: 0;
	transform: translateX(30px);
}
</style>
