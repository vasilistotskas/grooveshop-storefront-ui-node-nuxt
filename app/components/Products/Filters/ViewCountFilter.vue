<script setup lang="ts">
/**
 * View Count Filter Component
 *
 * Interactive filter for minimum view count using single-thumb slider.
 * Fetches view count statistics from Meilisearch and provides debounced updates
 * for optimal performance.
 *
 * @component
 */

const { t, locale } = useI18n()
const { filters, updateFilters } = useProductFilters()

// Fetch facet stats for view count during SSR
const { data: searchResults } = await useFetch('/api/products/search', {
  query: {
    facets: 'view_count',
    limit: 1,
    languageCode: locale.value,
  },
  key: `views-facets-${locale.value}`,
})

/**
 * Get view count statistics from Meilisearch facets
 */
const viewsStats = computed(() => {
  const stats = searchResults.value?.facetStats as FacetStats | undefined
  return stats?.viewCount || { min: 0, max: 10000 }
})

/**
 * Check if view count statistics are valid
 */
const hasValidStats = computed(() => {
  return viewsStats.value.min !== viewsStats.value.max
})

// Local override state - null means use computed values (SSR-safe)
// Only set when user interacts with the slider for immediate feedback
const localOverride = ref<number | null>(null)

// The actual views min value - uses local override if set, otherwise derives from filters/stats
const currentViewsMin = computed(() => {
  if (localOverride.value !== null) {
    return localOverride.value
  }
  return filters.value.viewsMin ?? viewsStats.value.min
})

/**
 * Update URL immediately (for slider commit)
 */
function updateUrl(value: number) {
  updateFilters({
    viewsMin: value !== viewsStats.value.min ? value : undefined,
  })
  // Clear local override after URL is updated - let computed take over
  localOverride.value = null
}

/**
 * Handle slider value changes during drag - only update local state for visual feedback
 */
function onSliderChange(value: number | undefined) {
  if (value === undefined) return
  localOverride.value = value
}

/**
 * Handle slider commit (when user releases the thumb) - trigger API call
 */
function onSliderCommit() {
  if (localOverride.value !== null) {
    updateUrl(localOverride.value)
  }
}

// Sync from URL changes (e.g., browser back/forward, external navigation)
// Clear local override when URL changes externally
watch(
  () => filters.value.viewsMin,
  () => {
    localOverride.value = null
  },
)

// Format number with locale
const formattedValue = computed(() => {
  return new Intl.NumberFormat(locale.value).format(currentViewsMin.value)
})
</script>

<template>
  <div v-if="hasValidStats" class="space-y-4">
    <!-- Current value display -->
    <div
      class="
        flex items-center justify-between
        px-3 py-2 rounded-lg
        bg-neutral-50 dark:bg-neutral-800/50
      "
    >
      <span class="text-sm text-neutral-600 dark:text-neutral-400">
        {{ t('minimum_views') }}
      </span>
      <div class="flex items-center gap-1.5">
        <UIcon name="i-heroicons-eye" class="size-4 text-blue-500" />
        <span class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {{ formattedValue }}+
        </span>
      </div>
    </div>

    <!-- Slider -->
    <div class="px-1">
      <USlider
        :model-value="currentViewsMin"
        :min="viewsStats.min"
        :max="viewsStats.max"
        :step="1"
        :aria-label="t('view_count_slider')"
        :aria-valuetext="t('min_views', { count: currentViewsMin })"
        class="py-2"
        @update:model-value="onSliderChange"
        @change="onSliderCommit"
      />
    </div>

    <!-- Range labels -->
    <div class="flex justify-between text-sm text-neutral-400">
      <span>{{ viewsStats.min }}</span>
      <span>{{ new Intl.NumberFormat(locale).format(viewsStats.max) }}</span>
    </div>
  </div>

  <!-- Loading state -->
  <div v-else class="flex items-center gap-2 py-4">
    <USkeleton class="h-2 w-full rounded-full" />
  </div>
</template>

<i18n lang="yaml">
el:
  minimum_views: Ελάχιστες προβολές
  view_count_slider: Ρυθμιστικό προβολών
  min_views: "Τουλάχιστον {count} προβολές"
</i18n>
