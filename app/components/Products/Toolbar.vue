<script setup lang="ts">
/**
 * Products Toolbar Component
 *
 * Unified control bar for sorting, view options, and filter toggle.
 * Provides results count display, sort dropdown, items per page selector,
 * and filter toggle button for mobile devices.
 *
 * @component
 */

/**
 * Props interface for the Toolbar component
 */
interface ToolbarProps {
  /** Total number of products matching current filters */
  totalResults?: number
  /** Currently selected sort option */
  currentSort?: string
  /** Number of items displayed per page */
  itemsPerPage?: number
  /** Whether any filters are currently active */
  hasActiveFilters?: boolean
  /** Count of active filters */
  activeFilterCount?: number
}

/**
 * Emits interface for the Toolbar component
 */
interface ToolbarEmits {
  /** Emitted when sort option changes */
  (e: 'update:sort', value: string): void
  /** Emitted when items per page changes */
  (e: 'update:itemsPerPage', value: number): void
  /** Emitted when filter toggle button is clicked (mobile) */
  (e: 'toggle-filters'): void
}

// Define props with defaults
const props = withDefaults(defineProps<ToolbarProps>(), {
  totalResults: 0,
  currentSort: 'newest',
  itemsPerPage: 12,
  hasActiveFilters: false,
  activeFilterCount: 0,
})

// Define emits
const emit = defineEmits<ToolbarEmits>()

// Get i18n instance for translations and number formatting
const { t, locale } = useI18n()

// Format the count with thousands separator
const formattedCount = computed(() => {
  return new Intl.NumberFormat(locale.value).format(props.totalResults)
})

// Sort options for the dropdown - using component i18n translations
const sortOptions = [
  { label: t('sort.newest'), value: '-created_at' },
  { label: t('sort.priceAsc'), value: 'final_price' },
  { label: t('sort.priceDesc'), value: '-final_price' },
  { label: t('sort.popularity'), value: '-likes_count' },
  { label: t('sort.mostViewed'), value: '-view_count' },
]

// Items per page options - using component i18n translations
const itemsPerPageOptions = [
  { label: t('itemsPerPage.twelve'), value: 12 },
  { label: t('itemsPerPage.twenty'), value: 20 },
  { label: t('itemsPerPage.twentyFour'), value: 24 },
  { label: t('itemsPerPage.fortyEight'), value: 48 },
]

// Handlers for user interactions
const handleSortChange = (value: any) => {
  if (value && typeof value === 'string') {
    emit('update:sort', value)
  }
}

const handleItemsPerPageChange = (value: any) => {
  if (value && typeof value === 'number') {
    emit('update:itemsPerPage', value)
  }
}

const handleToggleFilters = () => {
  emit('toggle-filters')
}
</script>

<template>
  <div
    class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    role="toolbar"
    aria-label="Product browsing controls"
  >
    <!-- Left section: Results count and filter toggle (mobile) -->
    <div class="flex items-center gap-3">
      <!-- Filter toggle button (mobile only) -->
      <UButton
        color="neutral"
        variant="outline"
        icon="i-heroicons-adjustments-horizontal"
        class="lg:hidden"
        aria-label="Toggle filters"
        @click="handleToggleFilters"
      >
        <span class="sr-only sm:not-sr-only">{{ t('filters') }}</span>
        <UBadge
          v-if="hasActiveFilters"
          :label="activeFilterCount.toString()"
          color="primary"
          size="sm"
          class="ml-2"
        />
      </UButton>

      <!-- Results count -->
      <div
        class="text-sm text-neutral-600 dark:text-neutral-400"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {{ t('resultsCount', { count: formattedCount }) }}
      </div>
    </div>

    <!-- Right section: Sort and items per page controls -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <!-- Sort control -->
      <div class="flex items-center gap-2">
        <label
          for="sort-select"
          class="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap"
        >
          {{ t('sortBy') }}:
        </label>
        <USelect
          id="sort-select"
          :model-value="currentSort"
          :items="sortOptions"
          class="min-w-[180px]"
          aria-label="Sort products"
          @update:model-value="handleSortChange"
        />
      </div>

      <!-- Items per page control -->
      <div class="flex items-center gap-2">
        <label
          for="items-per-page-select"
          class="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap"
        >
          {{ t('show') }}:
        </label>
        <USelect
          id="items-per-page-select"
          :model-value="itemsPerPage"
          :items="itemsPerPageOptions"
          class="min-w-[140px]"
          aria-label="Items per page"
          @update:model-value="handleItemsPerPageChange"
        />
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  resultsCount: '{count} προϊόντα'
  sortBy: 'Ταξινόμηση κατά'
  show: 'Εμφάνιση'
  filters: 'Φίλτρα'
  sort:
    newest: 'Νεότερα'
    priceAsc: 'Τιμή (Χαμηλή σε Υψηλή)'
    priceDesc: 'Τιμή (Υψηλή σε Χαμηλή)'
    popularity: 'Δημοφιλή'
    mostViewed: 'Περισσότερες Προβολές'
  itemsPerPage:
    twelve: '12 ανά σελίδα'
    twenty: '20 ανά σελίδα'
    twentyFour: '24 ανά σελίδα'
    fortyEight: '48 ανά σελίδα'
</i18n>
