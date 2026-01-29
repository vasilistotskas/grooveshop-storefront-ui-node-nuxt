<script setup lang="ts">
const { t } = useI18n()
const { filters, updateFilters } = useProductFilters()
const { locale } = useI18n()

// Fetch facet stats for likes count during SSR
const { data: searchResults } = await useFetch('/api/products/search', {
  query: {
    facets: 'likes_count',
    limit: 1,
    languageCode: locale.value,
  },
  key: `likes-facets-${locale.value}`,
})

// Get likes stats from facets or use defaults
const likesStats = computed(() => {
  const stats = searchResults.value?.facetStats as FacetStats | undefined
  return stats?.likesCount || { min: 0, max: 1000 }
})

// Check if we have valid stats
const hasValidStats = computed(() => {
  return likesStats.value.min !== likesStats.value.max
})

// Initialize local likes minimum from filters or stats
const localLikesMin = ref(filters.value.likesMin ?? likesStats.value.min)

// Debounced update to URL (500ms for sliders)
const debouncedUpdate = useDebounceFn((value: number) => {
  updateFilters({
    likesMin: value !== likesStats.value.min ? value : undefined,
  })
}, 500)

// Watch local changes and debounce updates
watch(localLikesMin, (newValue) => {
  debouncedUpdate(newValue)
})

// Sync with URL changes (e.g., browser back/forward)
watch(() => filters.value.likesMin, (newValue) => {
  const currentValue = newValue ?? likesStats.value.min

  if (currentValue !== localLikesMin.value) {
    localLikesMin.value = currentValue
  }
})

// Update local value when stats change
watch(likesStats, (newStats) => {
  if (!filters.value.likesMin) {
    localLikesMin.value = newStats.min
  }
})
</script>

<template>
  <UCollapsible :default-open="true">
    <template #trigger>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-heart" />
        <span>{{ $t('filters.popularity') }}</span>
      </div>
    </template>

    <template #content>
      <div v-if="hasValidStats" class="space-y-2">
        <USlider
          v-model="localLikesMin"
          :min="likesStats.min"
          :max="likesStats.max"
          :step="1"
          :aria-label="$t('filters.popularity')"
        />
        <div class="text-sm text-gray-600 dark:text-gray-400">
          {{ $t('filters.min_likes', { count: localLikesMin }) }}
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
  loading: Φόρτωση εύρους δημοτικότητας...
</i18n>
