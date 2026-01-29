<script setup lang="ts">
const { filters, updateFilters } = useProductFilters()
const { locale } = useI18n()

const categoriesOpen = ref(true)
const searchQuery = ref('')

// Fetch categories
const { data: categories, status } = await useFetch('/api/products/categories', {
  query: { languageCode: locale },
})

// Fetch facet distribution for category counts
// Include current filters (except categories) to show accurate counts
const facetQuery = computed(() => ({
  languageCode: locale.value,
  query: filters.value.search || undefined,
  priceMin: filters.value.priceMin,
  priceMax: filters.value.priceMax,
  likesMin: filters.value.likesMin,
  viewsMin: filters.value.viewsMin,
  sort: filters.value.sort,
  // Exclude categories from this query to get counts for all categories
  facets: 'category',
  limit: 1,
}))

// Create a unique key based on the filter values to ensure proper cache invalidation
const facetKey = computed(() => {
  const params = new URLSearchParams()
  if (filters.value.search) params.set('q', filters.value.search)
  if (filters.value.priceMin) params.set('priceMin', filters.value.priceMin.toString())
  if (filters.value.priceMax) params.set('priceMax', filters.value.priceMax.toString())
  if (filters.value.likesMin) params.set('likesMin', filters.value.likesMin.toString())
  if (filters.value.viewsMin) params.set('viewsMin', filters.value.viewsMin.toString())
  if (filters.value.sort) params.set('sort', filters.value.sort)
  return `category-facets-${params.toString()}`
})

const { data: searchResults } = await useFetch('/api/products/search', {
  key: facetKey,
  query: facetQuery,
})

// Get category facets (product counts per category)
const categoryFacets = computed(() => {
  const distribution = searchResults.value?.facetDistribution as FacetDistribution | undefined
  return distribution?.category || {}
})

// Selected categories from filters
const selectedCategories = computed(() => filters.value.categories)

// Filter categories based on search query and sort selected to top
const filteredCategories = computed(() => {
  return categories.value?.results
    ?.slice()
    .sort((a, b) => {
      const aIsSelected = selectedCategories.value.includes(a.id.toString())
      const bIsSelected = selectedCategories.value.includes(b.id.toString())
      if (aIsSelected && !bIsSelected) return -1
      if (!aIsSelected && bIsSelected) return 1
      return 0
    })
    .filter((category) => {
      const name = extractTranslated(category, 'name', locale.value)
      return name?.toLowerCase().includes(searchQuery.value.toLowerCase())
    })
})

// Toggle category selection
const toggleCategory = (categoryId: string) => {
  const currentCategories = [...selectedCategories.value]
  const index = currentCategories.indexOf(categoryId)

  if (index > -1) {
    currentCategories.splice(index, 1)
  }
  else {
    currentCategories.push(categoryId)
  }

  updateFilters({ categories: currentCategories })
}
</script>

<template>
  <UCollapsible v-model:open="categoriesOpen">
    <template #trigger>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-folder" />
        <span>{{ $t('filters.categories') }}</span>
        <UBadge v-if="selectedCategories.length" variant="soft" size="sm">
          {{ selectedCategories.length }}
        </UBadge>
      </div>
    </template>

    <template #content>
      <div class="space-y-3 pt-3">
        <!-- Search within categories -->
        <UInput
          v-model="searchQuery"
          icon="i-heroicons-magnifying-glass"
          :placeholder="`${$t('search.title')}...`"
          size="sm"
          :aria-label="$t('search.categories')"
        >
          <template v-if="searchQuery" #trailing>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              size="sm"
              @click="searchQuery = ''"
            />
          </template>
        </UInput>

        <!-- Category list with counts -->
        <div class="max-h-96 space-y-2 overflow-y-auto">
          <template v-if="status === 'pending'">
            <USkeleton v-for="i in 6" :key="i" class="h-8" />
          </template>

          <template v-else-if="filteredCategories?.length">
            <label
              v-for="category in filteredCategories"
              :key="category.id"
              class="flex items-center justify-between gap-2 rounded p-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              :class="{
                'bg-primary-50 dark:bg-primary-900': selectedCategories.includes(category.id.toString()),
              }"
            >
              <span class="flex items-center gap-2 flex-1">
                <input
                  type="checkbox"
                  :value="category.id.toString()"
                  :checked="selectedCategories.includes(category.id.toString())"
                  class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  @change="toggleCategory(category.id.toString())"
                >
                <span class="text-sm">
                  {{ extractTranslated(category, 'name', locale) }}
                </span>
              </span>
              <UBadge v-if="categoryFacets[category.id]" size="sm" variant="soft">
                {{ categoryFacets[category.id] }}
              </UBadge>
            </label>
          </template>

          <template v-else>
            <div class="py-8 text-center">
              <UIcon
                name="i-heroicons-magnifying-glass-minus"
                class="mx-auto size-12 text-gray-300 dark:text-gray-600"
              />
              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {{ $t('categories.not_found') }}
              </p>
            </div>
          </template>
        </div>
      </div>
    </template>
  </UCollapsible>
</template>
