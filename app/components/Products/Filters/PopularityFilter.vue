<script setup lang="ts">
/**
 * Popularity Filter Component
 *
 * Interactive filter for minimum likes count using single-thumb slider.
 * Fetches likes statistics from Meilisearch and provides debounced updates
 * for optimal performance.
 *
 * @component
 */

const { t, locale } = useI18n()
const { filters, updateFilters } = useProductFilters()

// Fetch facet stats for likes count during SSR
const { data: searchResults } = await useFetch('/api/products/search', {
  query: {
    facets: 'likes_count',
    limit: 1,
    languageCode: locale.value,
  },
  key: `likes-facets-${locale.value}`,
})

/**
 * Get likes statistics from Meilisearch facets
 */
const likesStats = computed(() => {
  const stats = searchResults.value?.facetStats as FacetStats | undefined
  return stats?.likesCount || { min: 0, max: 1000 }
})

/**
 * Check if likes statistics are valid
 */
const hasValidStats = computed(() => {
  return likesStats.value.min !== likesStats.value.max
})

// Local override state - null means use computed values (SSR-safe)
// Only set when user interacts with the slider for immediate feedback
const localOverride = ref<number | null>(null)

// The actual likes min value - uses local override if set, otherwise derives from filters/stats
const currentLikesMin = computed(() => {
  if (localOverride.value !== null) {
    return localOverride.value
  }
  return filters.value.likesMin ?? likesStats.value.min
})

/**
 * Update URL immediately (for slider commit)
 */
function updateUrl(value: number) {
  updateFilters({
    likesMin: value !== likesStats.value.min ? value : undefined,
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
  () => filters.value.likesMin,
  () => {
    localOverride.value = null
  },
)

// Format number with locale
const formattedValue = computed(() => {
  return new Intl.NumberFormat(locale.value).format(currentLikesMin.value)
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
        {{ t('minimum_likes') }}
      </span>
      <div class="flex items-center gap-1.5">
        <UIcon name="i-heroicons-heart-solid" class="size-4 text-red-500" />
        <span class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {{ formattedValue }}+
        </span>
      </div>
    </div>

    <!-- Slider -->
    <div class="px-1">
      <USlider
        :model-value="currentLikesMin"
        :min="likesStats.min"
        :max="likesStats.max"
        :step="1"
        :aria-label="t('popularity_slider')"
        :aria-valuetext="t('min_likes', { count: currentLikesMin })"
        class="py-2"
        @update:model-value="onSliderChange"
        @change="onSliderCommit"
      />
    </div>

    <!-- Range labels -->
    <div class="flex justify-between text-sm text-neutral-400">
      <span>{{ likesStats.min }}</span>
      <span>{{ new Intl.NumberFormat(locale).format(likesStats.max) }}</span>
    </div>
  </div>

  <!-- Loading state -->
  <div v-else class="flex items-center gap-2 py-4">
    <USkeleton class="h-2 w-full rounded-full" />
  </div>
</template>

<i18n lang="yaml">
el:
  minimum_likes: Likes
  popularity_slider: Ρυθμιστικό δημοτικότητας
  min_likes: "Τουλάχιστον {count} likes"
</i18n>
