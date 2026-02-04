<script setup lang="ts">
/**
 * Category Filter Component
 *
 * Displays a searchable list of product categories with facet counts.
 * Categories with zero products are disabled but visible.
 * Uses shared data from useProductSearchData composable.
 *
 * @component
 */

const { filters, updateFilters } = useProductFilters()
const { locale, t } = useI18n()

const searchQuery = ref('')

// Use shared category data from the centralized composable
const { allCategories, categoriesStatus, categoryFacets } = useProductSearchData()

// Selected categories from filters
const selectedCategories = computed(() => filters.value.categories)

// Filter categories based on search query and sort by product count
const filteredCategories = computed(() => {
  return allCategories.value
    ?.slice()
    .sort((a, b) => {
      const aIsSelected = selectedCategories.value.includes(a.id.toString())
      const bIsSelected = selectedCategories.value.includes(b.id.toString())

      // Selected categories always come first
      if (aIsSelected && !bIsSelected) return -1
      if (!aIsSelected && bIsSelected) return 1

      // Then sort by product count (descending)
      const aCount = categoryFacets.value[a.id] ?? 0
      const bCount = categoryFacets.value[b.id] ?? 0
      if (aCount !== bCount) return bCount - aCount

      // Finally, maintain tree order for categories with same count
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

  // If category is already selected, allow removal
  if (index > -1) {
    currentCategories.splice(index, 1)
    updateFilters({ categories: currentCategories })
    return
  }

  // If category has zero products, don't allow selection
  const categoryCount = categoryFacets.value[categoryId]
  if (categoryCount === 0) {
    return
  }

  // Add category to selection
  currentCategories.push(categoryId)
  updateFilters({ categories: currentCategories })
}

// Check if category is disabled (zero products and not selected)
const isCategoryDisabled = (categoryId: string) => {
  return (categoryFacets.value[categoryId] ?? 0) === 0
    && !selectedCategories.value.includes(categoryId)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Search within categories -->
    <UInput
      v-model="searchQuery"
      icon="i-heroicons-magnifying-glass"
      :placeholder="t('search_categories')"
      size="sm"
      :aria-label="t('search_categories')"
      :ui="{
        root: 'w-full',
      }"
    >
      <template v-if="searchQuery" #trailing>
        <UButton
          icon="i-heroicons-x-mark"
          variant="ghost"
          size="sm"
          :aria-label="t('clear_search')"
          @click="searchQuery = ''"
        />
      </template>
    </UInput>

    <!-- Category list -->
    <UScrollArea class="max-h-64">
      <div class="space-y-1 pr-2">
        <!-- Loading state -->
        <template v-if="categoriesStatus === 'pending'">
          <USkeleton v-for="i in 6" :key="i" class="h-9 rounded-lg" />
        </template>

        <!-- Category items -->
        <template v-else-if="filteredCategories?.length">
          <button
            v-for="category in filteredCategories"
            :key="category.id"
            type="button"
            class="
              cursor-pointer w-full flex items-center justify-between gap-3
              px-3 py-2 rounded-lg
              text-left text-sm
              transition-colors duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
            "
            :class="{
              'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300': selectedCategories.includes(category.id.toString()),
              'hover:bg-neutral-100 dark:hover:bg-neutral-800': !isCategoryDisabled(category.id.toString()),
              'opacity-40 cursor-not-allowed': isCategoryDisabled(category.id.toString()),
            }"
            :disabled="isCategoryDisabled(category.id.toString())"
            :aria-pressed="selectedCategories.includes(category.id.toString())"
            :aria-label="`${extractTranslated(category, 'name', locale)} - ${categoryFacets[category.id] ?? 0} ${t('products')}`"
            @click="toggleCategory(category.id.toString())"
          >
            <span class="flex items-center gap-2 flex-1 min-w-0">
              <span
                class="
                  flex items-center justify-center
                  size-5 rounded border
                  transition-colors duration-150
                "
                :class="{
                  'bg-primary-500 border-primary-500': selectedCategories.includes(category.id.toString()),
                  'border-neutral-300 dark:border-neutral-600': !selectedCategories.includes(category.id.toString()),
                }"
              >
                <UIcon
                  v-if="selectedCategories.includes(category.id.toString())"
                  name="i-heroicons-check"
                  class="size-5 text-white"
                />
              </span>
              <span class="truncate">
                {{ extractTranslated(category, 'name', locale) }}
              </span>
            </span>
            <UBadge
              v-if="categoryFacets[category.id] !== undefined"
              :label="(categoryFacets[category.id] ?? 0).toString()"
              color="neutral"
              variant="soft"
              :class="{ 'opacity-50': categoryFacets[category.id] === 0 }"
            />
          </button>
        </template>

        <!-- Empty state -->
        <template v-else>
          <div class="py-8 text-center">
            <UIcon
              name="i-heroicons-folder-open"
              class="mx-auto size-10 text-neutral-300 dark:text-neutral-600"
            />
            <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              {{ t('no_categories') }}
            </p>
          </div>
        </template>
      </div>
    </UScrollArea>
  </div>
</template>

<i18n lang="yaml">
el:
  search_categories: Αναζήτηση κατηγοριών
  clear_search: Καθαρισμός αναζήτησης
  no_categories: Δεν βρέθηκαν κατηγορίες
  products: προϊόντα
</i18n>
