<script lang="ts" setup>
const route = useRoute()
const { $i18n } = useNuxtApp()
const locale = computed(() => $i18n.locale.value)
const { loggedIn, user } = useUserSession()
const userStore = useUserStore()
const { updateFavouriteProducts } = userStore
const { filters, hasActiveFilters, activeFilterCount, updateFilters } = useProductFilters()
const { isMobile } = useDevice()

// Ref to the product grid container for scroll-to-top functionality
const productGridRef = ref<HTMLElement | null>(null)

// Track scroll position for preservation on sort/view density changes
const savedScrollPosition = ref<number | null>(null)
const shouldPreserveScroll = ref(false)

/**
 * Generate contextual empty state message based on active filters
 * Provides specific suggestions to help users find products
 */
const emptyStateDescription = computed(() => {
  // No filters active - generic message
  if (!hasActiveFilters.value) {
    return $i18n.t('products.no_results.no_filters')
  }

  // Build contextual suggestions based on active filters
  const suggestions: string[] = []

  if (filters.value.search) {
    suggestions.push($i18n.t('products.no_results.try_different_search'))
  }

  if (filters.value.priceMin !== undefined || filters.value.priceMax !== undefined) {
    suggestions.push($i18n.t('products.no_results.try_broader_price'))
  }

  if (filters.value.categories.length > 0) {
    suggestions.push($i18n.t('products.no_results.try_different_category'))
  }

  if (filters.value.likesMin !== undefined) {
    suggestions.push($i18n.t('products.no_results.try_lower_popularity'))
  }

  if (filters.value.viewsMin !== undefined) {
    suggestions.push($i18n.t('products.no_results.try_lower_views'))
  }

  // Return first suggestion or generic message
  if (suggestions.length > 0) {
    return suggestions[0]
  }

  return $i18n.t('products.no_results.description')
})

// Default items per page - matches Toolbar default
const limit = ref(12)
const page = ref(1)
const offset = computed(() => (page.value - 1) * limit.value)

// Sync page from URL - single source of truth
watch(
  () => route.query.page,
  (newPage) => {
    const pageNum = Number(newPage)
    const targetPage = pageNum > 0 ? pageNum : 1
    if (page.value !== targetPage) {
      page.value = targetPage
    }
  },
  { immediate: true },
)

// Handle page changes - update URL only
const handlePageChange = (newPage: number) => {
  const currentPage = Number(route.query.page) || 1
  if (newPage === currentPage) return // Already on this page

  const query = { ...route.query }

  if (newPage === 1) {
    // Remove page param for first page
    delete query.page
  }
  else {
    query.page = String(newPage)
  }

  navigateTo({
    query,
    replace: true, // Use replace to avoid cluttering history
  })
}

// Scroll to top of product grid when page changes (unless preserving scroll)
watch(page, () => {
  if (shouldPreserveScroll.value) {
    // Don't scroll on page changes when preserving scroll position
    return
  }

  if (productGridRef.value) {
    productGridRef.value.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }
})

// Fetch products with filters
const {
  data: products,
  status,
} = await useFetch<ProductMeiliSearchResponse>(
  '/api/products/search',
  {
    query: {
      query: computed(() => filters.value.search || undefined),
      priceMin: computed(() => filters.value.priceMin),
      priceMax: computed(() => filters.value.priceMax),
      likesMin: computed(() => filters.value.likesMin),
      viewsMin: computed(() => filters.value.viewsMin),
      categories: computed(() => filters.value.categories.length > 0 ? filters.value.categories.join(',') : undefined),
      sort: computed(() => filters.value.sort),
      languageCode: locale,
      limit,
      offset,
      facets: 'category,final_price,likes_count,view_count',
    },
    // Only watch limit and offset - query params are already reactive
    watch: [limit, offset],
  },
)

const productIds = computed(() => {
  if (!products.value) return []
  // For search results, use 'master' field (the actual product ID)
  // For regular products, use 'id' field
  return products.value.results?.map((product) => {
    if ('master' in product && typeof product.master === 'number') {
      return product.master
    }
    return product.id
  }) || []
})

const shouldFetchFavouriteProducts = computed(() => {
  return loggedIn.value && productIds.value.length > 0
})

const totalResults = computed(() => products.value?.estimatedTotalHits || 0)
const totalPages = computed(() => Math.ceil(totalResults.value / limit.value))

// Emit event to toggle filters (for mobile drawer)
const emit = defineEmits<{
  'toggle-filters': []
}>()

// Handle sort changes from Toolbar
const handleSortChange = (value: string) => {
  // Save current scroll position before sort change
  savedScrollPosition.value = window.scrollY
  shouldPreserveScroll.value = true

  updateFilters({ sort: value })

  // Restore scroll position after DOM updates (with small delta allowed)
  nextTick(() => {
    if (savedScrollPosition.value !== null) {
      // Allow up to 100px delta as per requirements
      const targetScroll = Math.max(0, savedScrollPosition.value)
      window.scrollTo({
        top: targetScroll,
        behavior: 'instant', // Use instant to avoid jarring animation
      })

      // Reset flags after restoration
      savedScrollPosition.value = null
      shouldPreserveScroll.value = false
    }
  })
}

// Handle items per page changes from Toolbar
const handleItemsPerPageChange = (value: number) => {
  // Save current scroll position before view density change
  savedScrollPosition.value = window.scrollY
  shouldPreserveScroll.value = true

  limit.value = value
  // Reset to page 1 when changing items per page
  handlePageChange(1)

  // Restore scroll position after DOM updates (with small delta allowed)
  nextTick(() => {
    if (savedScrollPosition.value !== null) {
      // Allow up to 100px delta as per requirements
      const targetScroll = Math.max(0, savedScrollPosition.value)
      window.scrollTo({
        top: targetScroll,
        behavior: 'instant', // Use instant to avoid jarring animation
      })

      // Reset flags after restoration
      savedScrollPosition.value = null
      shouldPreserveScroll.value = false
    }
  })
}

// Reset page to 1 when filters change (excluding page and sort)
// Sort changes should preserve scroll position, not reset page
// Use a ref to track previous filter values for accurate comparison
const previousFilters = ref<string | null>(null)

watch(
  () => ({
    search: filters.value.search,
    priceMin: filters.value.priceMin,
    priceMax: filters.value.priceMax,
    likesMin: filters.value.likesMin,
    viewsMin: filters.value.viewsMin,
    categories: filters.value.categories.join(','), // Convert to string for proper comparison
    // Note: sort is intentionally excluded - sort changes preserve scroll position
  }),
  (newFilters) => {
    const newFiltersStr = JSON.stringify(newFilters)

    // Initialize on first run
    if (previousFilters.value === null) {
      previousFilters.value = newFiltersStr
      return
    }

    // Only reset if filters actually changed
    if (newFiltersStr !== previousFilters.value) {
      previousFilters.value = newFiltersStr

      // Reset to page 1 if not already there
      const currentPage = Number(route.query.page) || 1
      if (currentPage !== 1) {
        handlePageChange(1)
      }
    }
  },
  { immediate: true },
)

// User-specific data: client-side only to avoid blocking SSR
if (shouldFetchFavouriteProducts.value) {
  await useFetch('/api/products/favourites/favourites-by-products', {
    key: computed(() => `favouritesByProducts-${user.value?.id}-${productIds.value.join(',')}`),
    method: 'POST',
    body: {
      productIds,
    },
    server: false, // Client-side only - user-specific data
    onResponse({ response }) {
      if (!response.ok) {
        return
      }
      const favourites = response._data
      if (favourites) {
        updateFavouriteProducts(favourites)
      }
    },
  })
}
</script>

<template>
  <div
    ref="productGridRef"
    class="flex w-full flex-col gap-6"
  >
    <!-- Toolbar with sort, view options, and filter toggle -->
    <ProductsToolbar
      :total-results="totalResults"
      :current-sort="filters.sort"
      :items-per-page="limit"
      :has-active-filters="hasActiveFilters"
      :active-filter-count="activeFilterCount"
      @update:sort="handleSortChange"
      @update:items-per-page="handleItemsPerPageChange"
      @toggle-filters="emit('toggle-filters')"
    />

    <!-- Loading state -->
    <ol
      v-if="status === 'pending' && !products"
      class="
        grid grid-cols-1 items-center justify-center gap-4
        sm:grid-cols-2
        lg:grid-cols-3 lg:gap-6
        xl:grid-cols-4
      "
    >
      <ProductCardSkeleton
        v-for="i in limit"
        :key="i"
      />
    </ol>

    <!-- Empty state -->
    <UEmpty
      v-else-if="!products?.results?.length"
      icon="i-heroicons-magnifying-glass-minus"
      :title="$i18n.t('products.no_results.title')"
      :description="emptyStateDescription"
      :actions="hasActiveFilters ? [
        {
          label: $i18n.t('products.no_results.clear_filters'),
          size: 'xl',
          color: 'primary',
          variant: 'solid',
          leadingIcon: 'i-heroicons-arrow-path',
          block: false,
          onClick: () => useProductFilters().clearFilters(),
        },
      ] : undefined"
    />

    <!-- Product grid -->
    <template v-else>
      <TransitionGroup
        name="product-fade"
        tag="ol"
        class="
          grid grid-cols-1 items-center justify-center gap-4
          sm:grid-cols-2
          lg:grid-cols-3 lg:gap-6
          xl:grid-cols-4
        "
      >
        <ProductCard
          v-for="(product, index) in products.results"
          :key="product.id"
          :img-loading="index > 7 ? 'lazy' : 'eager'"
          :product="product as unknown as Product"
        />
      </TransitionGroup>

      <!-- Pagination -->
      <div
        v-if="totalPages > 1"
        class="flex flex-col items-center gap-4 pt-8"
      >
        <!-- Page info -->
        <div class="text-sm text-gray-600 dark:text-gray-400">
          {{ $i18n.t('pagination.page_info', { current: page, total: totalPages }) }}
        </div>

        <!-- Pagination controls -->
        <UPagination
          :page="page"
          :total="totalResults"
          :items-per-page="limit"
          :show-first="!isMobile"
          :show-last="!isMobile"
          :size="isMobile ? 'lg' : 'md'"
          color="neutral"
          variant="outline"
          active-color="primary"
          active-variant="solid"
          :sibling-count="isMobile ? 0 : 1"
          :show-edges="false"
          :aria-label="$i18n.t('pagination.navigation')"
          :ui="{
            root: 'flex items-center gap-2',
            list: 'flex items-center gap-1.5',
            item: `
              min-h-[44px] min-w-[44px] transition-all duration-200
              hover:scale-105
            `,
            first: `
              min-h-[44px] min-w-[44px] transition-all duration-200
              hover:scale-105
            `,
            prev: `
              min-h-[44px] min-w-[44px] transition-all duration-200
              hover:scale-105
            `,
            next: `
              min-h-[44px] min-w-[44px] transition-all duration-200
              hover:scale-105
            `,
            last: `
              min-h-[44px] min-w-[44px] transition-all duration-200
              hover:scale-105
            `,
          }"
          @update:page="handlePageChange"
        />
      </div>
    </template>

    <!-- Live region for screen readers -->
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class="sr-only"
    >
      {{ $i18n.t('products.results_count', { count: totalResults }) }}
    </div>
  </div>
</template>

<style scoped>
/* Fade-in animation for product cards */
.product-fade-enter-active {
  transition: opacity 300ms ease-out, transform 300ms ease-out;
}

.product-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.product-fade-enter-to {
  opacity: 1;
  transform: translateY(0);
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .product-fade-enter-active {
    transition: none;
  }

  .product-fade-enter-from {
    opacity: 1;
    transform: none;
  }
}
</style>
