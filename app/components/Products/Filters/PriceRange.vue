<script setup lang="ts">
/**
 * Price Range Filter Component
 *
 * Interactive price range filter using dual-thumb slider for min/max selection.
 * Uses shared price statistics from useProductSearchData composable, in
 * the listing's scope: a category page's slider spans that category's
 * prices.
 *
 * Features:
 * - Dual-thumb slider for intuitive range selection
 * - Manual input fields for precise values
 * - Currency formatting with thousands separator
 * - Debounced updates (300ms) to reduce API calls
 * - Bidirectional sync with URL parameters
 * - Accessible with proper ARIA labels
 * - SSR-compatible with proper hydration handling
 *
 * @component
 */

const { t, n } = useI18n()
const { filters, updateFilters } = useProductFilters()

// Use shared price stats from the centralized composable
const { priceStats, isPriceStatsLoaded } = useProductSearchData(useListingScope())

// Get currency symbol from i18n
const currencySymbol = computed(() => {
  // Format 0 as currency and extract just the symbol
  const formatted = n(0, 'currency')
  return formatted.replace(/[\d\s.,]+/g, '').trim()
})

/**
 * Check if price statistics are valid and loaded
 */
const hasValidStats = computed(() => {
  return isPriceStatsLoaded.value && priceStats.value.min !== priceStats.value.max
})

// Local override state - null means use computed values (SSR-safe)
// Only set when user interacts with the slider for immediate feedback
const localOverride = ref<[number, number] | null>(null)

// The actual price range - uses local override if set, otherwise derives from filters/priceStats
// This ensures SSR renders with the correct values from the payload
const currentPriceRange = computed<[number, number]>(() => {
  if (localOverride.value) {
    return localOverride.value
  }
  return [
    filters.value.priceMin ?? priceStats.value.min,
    filters.value.priceMax ?? priceStats.value.max,
  ]
})

/**
 * Debounced update to URL parameters (for input fields)
 */
const debouncedUpdateUrl = useDebounceFn((range: [number, number]) => {
  updateFilters({
    priceMin: range[0] !== priceStats.value.min ? range[0] : undefined,
    priceMax: range[1] !== priceStats.value.max ? range[1] : undefined,
  })
  // Clear local override after URL is updated - let computed take over
  localOverride.value = null
}, 300)

/**
 * Update URL immediately (for slider commit)
 */
function updateUrl(range: [number, number]) {
  updateFilters({
    priceMin: range[0] !== priceStats.value.min ? range[0] : undefined,
    priceMax: range[1] !== priceStats.value.max ? range[1] : undefined,
  })
  // Clear local override after URL is updated - let computed take over
  localOverride.value = null
}

/**
 * Handle slider value changes during drag - only update local state for visual feedback
 */
function onSliderChange(value: [number, number] | undefined) {
  if (!value) return
  localOverride.value = value
}

/**
 * Handle slider commit (when user releases the thumb) - trigger API call
 */
function onSliderCommit() {
  if (localOverride.value) {
    updateUrl(localOverride.value)
  }
}

/**
 * Handle min input change
 */
function onMinChange(event: Event) {
  const target = event.target as HTMLInputElement
  const value = Number(target.value)
  if (!Number.isNaN(value)) {
    const newRange: [number, number] = [value, currentPriceRange.value[1]]
    localOverride.value = newRange
    debouncedUpdateUrl(newRange)
  }
}

/**
 * Handle max input change
 */
function onMaxChange(event: Event) {
  const target = event.target as HTMLInputElement
  const value = Number(target.value)
  if (!Number.isNaN(value)) {
    const newRange: [number, number] = [currentPriceRange.value[0], value]
    localOverride.value = newRange
    debouncedUpdateUrl(newRange)
  }
}

// Sync from URL changes (e.g., browser back/forward, external navigation)
// Clear local override when URL changes externally
watch(
  [() => filters.value.priceMin, () => filters.value.priceMax],
  () => {
    // Clear override so computed takes over with new URL values
    localOverride.value = null
  },
)
</script>

<template>
  <div
    v-if="hasValidStats"
    class="flex flex-col gap-3.5"
  >
    <USlider
      :model-value="currentPriceRange"
      :min="priceStats.min"
      :max="priceStats.max"
      :step="1"
      color="secondary"
      :aria-label="t('price_range')"
      @update:model-value="onSliderChange"
      @change="onSliderCommit"
    />

    <div class="grid grid-cols-2 gap-2.5">
      <UInput
        :model-value="currentPriceRange[0]"
        type="number"
        :min="priceStats.min"
        :max="currentPriceRange[1]"
        :aria-label="t('price_min')"
        :placeholder="priceStats.min.toString()"
        :ui="{ base: 'h-10 font-mono' }"
        @change="onMinChange"
      >
        <template #trailing>
          <span class="font-mono text-sm text-muted">{{ currencySymbol }}</span>
        </template>
      </UInput>
      <UInput
        :model-value="currentPriceRange[1]"
        type="number"
        :min="currentPriceRange[0]"
        :max="priceStats.max"
        :aria-label="t('price_max')"
        :placeholder="priceStats.max.toString()"
        :ui="{ base: 'h-10 font-mono' }"
        @change="onMaxChange"
      >
        <template #trailing>
          <span class="font-mono text-sm text-muted">{{ currencySymbol }}</span>
        </template>
      </UInput>
    </div>
  </div>

  <!-- Loading state -->
  <div
    v-else
    class="flex items-center gap-2 py-4"
  >
    <USkeleton class="h-2 w-full rounded-full" />
  </div>
</template>

<i18n lang="yaml">
el:
  price_range: Εύρος τιμής
  price_min: Ελάχιστη τιμή
  price_max: Μέγιστη τιμή
en:
  price_range: Price range
  price_min: Minimum price
  price_max: Maximum price
</i18n>
