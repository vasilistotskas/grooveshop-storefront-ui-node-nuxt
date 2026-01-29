<script setup lang="ts">
const { t } = useI18n()
const { filters, updateFilters } = useProductFilters()
const { locale } = useI18n()

// Fetch facet stats for price range during SSR
const { data: searchResults } = await useFetch('/api/products/search', {
  query: {
    facets: 'final_price',
    limit: 1,
    languageCode: locale.value,
  },
  key: `price-facets-${locale.value}`,
})

// Get price stats from facets or use defaults
const priceStats = computed(() => {
  const stats = searchResults.value?.facetStats as FacetStats | undefined
  return stats?.finalPrice || { min: 0, max: 1000 }
})

// Check if we have valid stats
const hasValidStats = computed(() => {
  return priceStats.value.min !== priceStats.value.max
})

// Initialize local price range from filters or stats
const localPriceRange = ref([
  filters.value.priceMin ?? priceStats.value.min,
  filters.value.priceMax ?? priceStats.value.max,
])

// Debounced update to URL (500ms for sliders)
const debouncedUpdate = useDebounceFn((range: number[]) => {
  updateFilters({
    priceMin: range[0] !== priceStats.value.min ? range[0] : undefined,
    priceMax: range[1] !== priceStats.value.max ? range[1] : undefined,
  })
}, 500)

// Watch local changes and debounce updates
watch(localPriceRange, (newRange) => {
  debouncedUpdate(newRange)
}, { deep: true })

// Sync with URL changes (e.g., browser back/forward)
watch(() => [filters.value.priceMin, filters.value.priceMax], ([newMin, newMax]) => {
  const currentMin = newMin ?? priceStats.value.min
  const currentMax = newMax ?? priceStats.value.max

  if (currentMin !== localPriceRange.value[0] || currentMax !== localPriceRange.value[1]) {
    localPriceRange.value = [currentMin, currentMax]
  }
})

// Update local range when stats change
watch(priceStats, (newStats) => {
  if (!filters.value.priceMin && !filters.value.priceMax) {
    localPriceRange.value = [newStats.min, newStats.max]
  }
})
</script>

<template>
  <UCollapsible :default-open="true">
    <template #trigger>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-currency-euro" />
        <span>{{ $t('filters.price') }}</span>
      </div>
    </template>

    <template #content>
      <div v-if="hasValidStats" class="space-y-4">
        <USlider
          v-model="localPriceRange"
          :min="priceStats.min"
          :max="priceStats.max"
          :step="1"
          :aria-label="$t('filters.price')"
        />

        <div class="flex gap-2">
          <UInput
            v-model.number="localPriceRange[0]"
            type="number"
            :min="priceStats.min"
            :max="localPriceRange[1]"
            size="sm"
            :aria-label="$t('filters.price_min')"
          >
            <template #leading>
              €
            </template>
          </UInput>

          <UInput
            v-model.number="localPriceRange[1]"
            type="number"
            :min="localPriceRange[0]"
            :max="priceStats.max"
            size="sm"
            :aria-label="$t('filters.price_max')"
          >
            <template #leading>
              €
            </template>
          </UInput>
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
  loading: Φόρτωση εύρους τιμών...
</i18n>
