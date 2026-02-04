<script setup lang="ts">
/**
 * Active Filters Component
 *
 * Displays currently active filters as removable chips with smooth animations.
 * Provides visual feedback for applied filters and allows users to remove
 * individual filters or clear all filters at once.
 * Uses shared category data from useProductSearchData composable.
 *
 * @component
 */

const { activeFilterChips, removeFilter, clearFilters, hasActiveFilters, filters, updateFilters } = useProductFilters()
const { t, n } = useI18n()

// Use shared category and attribute value name maps from the centralized composable
const { getCategoryName, getAttributeValueName } = useProductSearchData()

/**
 * Format filter value for display
 */
const formatFilterValue = (chip: FilterChip): string => {
  switch (chip.type) {
    case 'price':
      if (chip.value.min !== undefined && chip.value.max !== undefined) {
        return `${n(chip.value.min, 'currency')} – ${n(chip.value.max, 'currency')}`
      }
      else if (chip.value.min !== undefined) {
        return `${n(chip.value.min, 'currency')}+`
      }
      else if (chip.value.max !== undefined) {
        return t('up_to', { price: n(chip.value.max, 'currency') })
      }
      return chip.label
    case 'likes':
      return t('min_likes', { count: chip.value })
    case 'views':
      return t('min_views', { count: chip.value })
    case 'category':
      return getCategoryName(chip.value)
    case 'attribute':
      return getAttributeValueName(chip.value)
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
 * Get icon for filter type
 */
const getFilterIcon = (type: string): string => {
  const icons: Record<string, string> = {
    search: 'i-heroicons-magnifying-glass',
    price: 'i-heroicons-currency-euro',
    likes: 'i-heroicons-heart',
    views: 'i-heroicons-eye',
    category: 'i-heroicons-folder',
    attribute: 'i-heroicons-tag',
    sort: 'i-heroicons-arrows-up-down',
  }
  return icons[type] || 'i-heroicons-funnel'
}

/**
 * Handle filter removal
 */
const handleRemoveFilter = (chip: FilterChip) => {
  if (chip.type === 'category') {
    const newCategories = filters.value.categories.filter(cat => cat !== chip.value)
    updateFilters({ categories: newCategories })
  }
  else if (chip.type === 'attribute') {
    const newAttributeValues = filters.value.attributeValues.filter(attrVal => attrVal !== chip.value)
    updateFilters({ attributeValues: newAttributeValues })
  }
  else if (chip.type === 'price') {
    updateFilters({ priceMin: undefined, priceMax: undefined })
  }
  else {
    removeFilter(chip.key)
  }
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div v-if="hasActiveFilters" class="space-y-3">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {{ t('active_filters') }}
        </h3>
        <UButton
          variant="link"
          size="sm"
          color="neutral"
          :aria-label="t('clear_all')"
          @click="clearFilters"
        >
          {{ t('clear_all') }}
        </UButton>
      </div>

      <!-- Filter chips -->
      <TransitionGroup
        name="chip"
        tag="div"
        class="flex flex-wrap gap-2"
      >
        <UBadge
          v-for="(chip, index) in activeFilterChips"
          :key="`${chip.key}-${index}`"
          color="neutral"
          variant="soft"
          size="lg"
          class="
            group
            pl-2 pr-1 py-1
            cursor-default
            transition-all duration-200
            hover:shadow-sm
          "
        >
          <div class="flex items-center gap-1.5">
            <UIcon
              :name="getFilterIcon(chip.type)"
              class="size-5 opacity-60"
            />
            <span class="text-sm font-medium max-w-32 truncate">
              {{ formatFilterValue(chip) }}
            </span>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              size="sm"
              color="primary"
              class="
                size-5 p-0
                opacity-60 group-hover:opacity-100
                transition-opacity duration-150
              "
              :aria-label="t('remove_filter', { filter: chip.label })"
              @click="handleRemoveFilter(chip)"
            />
          </div>
        </UBadge>
      </TransitionGroup>
    </div>
  </Transition>
</template>

<i18n lang="yaml">
el:
  active_filters: Ενεργά φίλτρα
  clear_all: Καθαρισμός όλων
  remove_filter: "Αφαίρεση φίλτρου {filter}"
  up_to: "Έως {price}"
  min_likes: "{count}+ likes"
  min_views: "{count}+ προβολές"
  sort:
    price_asc: Τιμή ↑
    price_desc: Τιμή ↓
    popularity: Δημοφιλή
    most_viewed: Προβολές
    newest: Νεότερα
    default: Προεπιλογή
</i18n>

<style scoped>
/* Chip enter/leave animations */
.chip-enter-active,
.chip-leave-active {
  transition: all 0.2s ease;
}

.chip-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

.chip-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.chip-move {
  transition: transform 0.2s ease;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .chip-enter-active,
  .chip-leave-active,
  .chip-move {
    transition: none;
  }
}
</style>
