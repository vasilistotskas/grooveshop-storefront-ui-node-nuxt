<script lang="ts" setup>
const productCategoryStore = useProductCategoryStore()
const { categories } = storeToRefs(productCategoryStore)
const { fetchCategories } = productCategoryStore

const { locale } = useI18n()
const { extractTranslated } = useTranslationExtractor()
const route = useRoute()

await fetchCategories({})

const sidebar = ref(null)
const searchQuery = ref('')
const selectedCategoryIds = computed(() => {
	return route.query.category ? route.query.category.toString().split('_') : []
})

const filteredCategories = computed(() => {
	return categories.value?.results
		?.slice()
		.sort((a, b) => {
			const aIsSelected = selectedCategoryIds.value.includes(a.id.toString())
			const bIsSelected = selectedCategoryIds.value.includes(b.id.toString())
			if (aIsSelected && !bIsSelected) {
				return -1
			} else if (!aIsSelected && bIsSelected) {
				return 1
			}
			return 0
		})
		.filter((category) => {
			return extractTranslated(category, 'name', locale.value)
				.toLowerCase()
				.includes(searchQuery.value.toLowerCase())
		})
})

onMounted(() => {
	if (!sidebar.value) return
	const { onScroll } = useSticky(sidebar.value as HTMLElement, 150)
	setTimeout(() => onScroll(), 50)
})
</script>

<template>
	<div
		v-if="categories && categories.count > 0"
		ref="sidebar"
		class="sidebar relative hidden h-fit w-60 transition-all duration-300 ease-in-out lg:flex"
	>
		<div class="grid w-full flex-1 gap-4 overflow-y-auto pl-4 pr-4 lg:pl-0">
			<div class="sidebar-header-sticky grid gap-4 bg-zinc-100 dark:bg-zinc-900">
				<h2 class="flex items-center gap-2 p-2 text-center text-2xl font-bold">
					{{ $t('common.categories') }}
					<span class="text-primary-700 dark:text-primary-100 text-sm font-normal">
						({{ categories.count }})
					</span>
				</h2>
				<label class="sr-only" for="search">
					{{ $t('common.search') }}
				</label>
				<UInput
					id="search"
					v-model="searchQuery"
					name="search"
					icon="i-heroicons-magnifying-glass-20-solid"
					class="hidden p-2 md:grid"
					color="white"
					:trailing="false"
					variant="outline"
					:placeholder="`${$t('common.search')}...`"
				/>
			</div>
			<ul
				v-if="filteredCategories && filteredCategories.length > 0"
				class="grid max-h-96 gap-2 md:gap-4"
			>
				<ProductsSidebarCategory
					v-for="category in filteredCategories"
					:key="category.id"
					:category="category"
				/>
			</ul>
			<div v-else>
				<p class="text-primary-700 dark:text-primary-100 p-2 text-center">
					{{ $t('common.no_categories_found') }}
				</p>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.sidebar {
	&.sticky {
		top: 0;
	}
}
.sidebar-header-sticky {
	position: sticky;
	top: 0;
	z-index: 10;
}
</style>
