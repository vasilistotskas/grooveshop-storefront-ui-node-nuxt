<script setup lang="ts">
const { activeFilterChips, removeFilter, clearFilters, hasActiveFilters, filters, updateFilters } = useProductFilters()
const { t } = useI18n()

/**
 * Format filter value for display
 */
const formatFilterValue = (chip: FilterChip): string => {
  switch (chip.type) {
    case 'price':
      if (chip.value.min !== undefined && chip.value.max !== undefined) {
        return `€${chip.value.min} - €${chip.value.max}`
      }
      else if (chip.value.min !== undefined) {
        return `€${chip.value.min}+`
      }
      else if (chip.value.max !== undefined) {
        return t('filters.up_to', { price: chip.value.max })
      }
      return chip.label
    case 'likes':
      return t('filters.min_likes', { count: chip.value })
    case 'views':
      return t('filters.min_views', { count: chip.value })
    case 'category':
      // For categories, the value is the category ID
      // We'll display the label which should be set by the CategoryFilter component
      return chip.value
    case 'search':
      return `"${chip.value}"`
    case 'sort':
      return getSortLabel(chip.value)
    default:
      return String(chip.value)
  }
}

/**
 * Get human-readable sort label
 */
const getSortLabel = (sortValue: string): string => {
  const sortLabels: Record<string, string> = {
    'finalPrice': t('sort.price_asc'),
    '-finalPrice': t('sort.price_desc'),
    '-likesCount': t('sort.popularity'),
    '-viewCount': t('sort.most_viewed'),
    '-createdAt': t('sort.newest'),
    '-availabilityPriority': t('sort.default'),
  }
  return sortLabels[sortValue] || sortValue
}

/**
 * Handle filter removal
 * For categories, we need special handling since multiple category chips can exist
 */
const handleRemoveFilter = (chip: FilterChip) => {
  if (chip.type === 'category') {
    // Remove specific category from the array
    const newCategories = filters.value.categories.filter(cat => cat !== chip.value)
    updateFilters({ categories: newCategories })
  }
  else if (chip.type === 'price') {
    // Clear both price min and max
    updateFilters({ priceMin: undefined, priceMax: undefined })
  }
  else {
    removeFilter(chip.key)
  }
}
</script>

<template>
  <div v-if="hasActiveFilters" class="space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">{{ $t('filters.active') }}</span>
      <UButton
        variant="ghost"
        size="xs"
        icon="i-heroicons-x-mark"
        :aria-label="$t('filters.clear_all')"
        @click="clearFilters"
      >
        {{ $t('filters.clear_all') }}
      </UButton>
    </div>

    <div class="flex flex-wrap gap-2">
      <UBadge
        v-for="(chip, index) in activeFilterChips"
        :key="`${chip.key}-${index}`"
        variant="soft"
        color="primary"
        size="md"
      >
        <div class="flex items-center gap-1">
          <span>{{ formatFilterValue(chip) }}</span>
          <UButton
            icon="i-heroicons-x-mark"
            variant="ghost"
            size="xs"
            :aria-label="$t('filters.remove_filter', { filter: chip.label })"
            @click="handleRemoveFilter(chip)"
          />
        </div>
      </UBadge>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  filters:
    up_to: Έως €{price}
</i18n>
