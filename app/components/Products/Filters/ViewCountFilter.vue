<script setup lang="ts">
const { t } = useI18n()
const { filters, updateFilters } = useProductFilters()
const { locale } = useI18n()

// Fetch facet stats for view count during SSR
const { data: searchResults } = await useFetch('/api/products/search', {
  query: {
    facets: 'view_count',
    limit: 1,
    languageCode: locale.value,
  },
  key: `views-facets-${locale.value}`,
})

// Get views stats from facets or use defaults
const viewsStats = computed(() => {
  const stats = searchResults.value?.facetStats as FacetStats | undefined
  return stats?.viewCount || { min: 0, max: 10000 }
})

// Check if we have valid stats
const hasValidStats = computed(() => {
  return viewsStats.value.min !== viewsStats.value.max
})

// Initialize local views minimum from filters or stats
const localViewsMin = ref(filters.value.viewsMin ?? viewsStats.value.min)

// Debounced update to URL (500ms for sliders)
const debouncedUpdate = useDebounceFn((value: number) => {
  updateFilters({
    viewsMin: value !== viewsStats.value.min ? value : undefined,
  })
}, 500)

// Watch local changes and debounce updates
watch(localViewsMin, (newValue) => {
  debouncedUpdate(newValue)
})

// Sync with URL changes (e.g., browser back/forward)
watch(() => filters.value.viewsMin, (newValue) => {
  const currentValue = newValue ?? viewsStats.value.min

  if (currentValue !== localViewsMin.value) {
    localViewsMin.value = currentValue
  }
})

// Update local value when stats change
watch(viewsStats, (newStats) => {
  if (!filters.value.viewsMin) {
    localViewsMin.value = newStats.min
  }
})
</script>

<template>
  <UCollapsible :default-open="true">
    <template #trigger>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-eye" />
        <span>{{ $t('filters.view_count') }}</span>
      </div>
    </template>

    <template #content>
      <div v-if="hasValidStats" class="space-y-2">
        <USlider
          v-model="localViewsMin"
          :min="viewsStats.min"
          :max="viewsStats.max"
          :step="1"
          :aria-label="$t('filters.view_count')"
        />
        <div class="text-sm text-gray-600 dark:text-gray-400">
          {{ $t('filters.min_views', { count: localViewsMin }) }}
        </div>
      </div>
      <div v-else class="text-sm text-gray-500">
        {{ t('loading') }}
      </div>
    </template>
  </UCollapsible>
</template>

<i18n lang="yaml">
el:
  loading: Φόρτωση εύρους προβολών...
</i18n>
