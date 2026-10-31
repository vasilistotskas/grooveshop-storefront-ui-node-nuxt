<script lang="ts" setup>
// ``categoryId`` scopes the listing to one category when this component
// is rendered on a category landing page (products/category/[id]/[slug]).
// It is the PAGE context, not a URL filter — the category lives in the
// route path, not ``?category=`` — so `useProductListing` merges it into the
// search query rather than going through useProductFilters()'s URL state. On
// the plain /products page the prop is absent and the listing is filter-driven.
const props = defineProps<{ categoryId?: number }>()

const { t } = useStoreI18n('components/variants/webside/Products/List')
const { isMobile } = useDevice()

const {
  filters,
  hasActiveFilters,
  activeFilterCount,
  products,
  status,
  productGridRef,
  emptyStateDescription,
  limit,
  page,
  totalResults,
  totalPages,
  handlePageChange,
  handleSortChange,
  handleItemsPerPageChange,
} = await useProductListing({ categoryId: () => props.categoryId })

// Emit event to toggle filters (for mobile drawer)
const emit = defineEmits<{
  'toggle-filters': []
}>()
</script>

<template>
  <div
    ref="productGridRef"
    class="flex w-full flex-col gap-6"
  >
    <!-- The results' own heading, for the outline: the cards' titles are
         h3s, and the page's h1 is the listing's name. -->
    <h2 class="sr-only">
      {{ t('heading') }}
    </h2>

    <!-- Toolbar with sort, view options, and filter toggle -->
    <WebsideProductsToolbar
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
      <WebsideProductCardSkeleton
        v-for="i in limit"
        :key="i"
      />
    </ol>

    <!-- Empty state -->
    <UEmpty
      v-else-if="!products?.results?.length"
      icon="i-heroicons-magnifying-glass-minus"
      :title="t('products.no_results.title')"
      :description="emptyStateDescription"
      :actions="hasActiveFilters ? [
        {
          label: t('products.no_results.clear_filters'),
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
        <WebsideProductCard
          v-for="(product, index) in products.results"
          :key="product.id"
          :img-loading="index > 7 ? 'lazy' : 'eager'"
          :img-fetch-priority="index === 0 ? 'high' : undefined"
          :preload="index === 0"
          :product="product as unknown as Product"
        />
      </TransitionGroup>

      <!-- Pagination -->
      <div
        v-if="totalPages > 1"
        class="flex flex-col items-center gap-4 pt-8"
      >
        <!-- Page info -->
        <div class="text-sm text-gray-600 dark:text-gray-200">
          {{ t('pagination.page_info', { current: page, total: totalPages }) }}
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
          :aria-label="t('pagination.navigation')"
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
      {{ t('products.results_count', { count: totalResults }) }}
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  heading: Αποτελέσματα
en:
  heading: Results
</i18n>

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
