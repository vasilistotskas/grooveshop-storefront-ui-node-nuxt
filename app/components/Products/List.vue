<script lang="ts" setup>
// ``categoryId`` scopes the listing to one category when this component
// is rendered on a category landing page (products/category/[id]/[slug]).
// It is the PAGE context, not a URL filter — the category lives in the
// route path, not ``?category=`` — so `useProductListing` merges it into the
// search query rather than going through useProductFilters()'s URL state. On
// the plain /products page the prop is absent and the listing is filter-driven.
const props = defineProps<{ categoryId?: number }>()

const { t } = useStoreI18n('components/Products/List')

const {
  filters,
  updateFilters,
  hasActiveFilters,
  products,
  status,
  productGridRef,
  emptyStateDescription,
  limit,
  page,
  totalResults,
  totalPages,
  pageLink,
  handlePageChange,
  handleSortChange,
  handleItemsPerPageChange,
} = await useProductListing({ categoryId: () => props.categoryId })

/**
 * One grid definition for the results and for the skeletons that stand
 * in for them. Two copies drifted apart and the page jumped by a row
 * when the products arrived.
 */
const GRID_CLASS = `
  grid grid-cols-2 gap-3.5
  lg:grid-cols-3 lg:gap-7
`

const emit = defineEmits<{
  /** The narrow-screen filter drawer. */
  'toggle-filters': []
  /** How many products match, for the drawer's "Show N products". */
  'update:totalResults': [total: number]
}>()

watch(totalResults, total => emit('update:totalResults', total), { immediate: true })
</script>

<template>
  <div
    ref="productGridRef"
    class="flex w-full flex-col gap-4.5 lg:gap-7"
  >
    <!-- The results' own heading, for the outline: the cards' titles are
         h3s, and the page's h1 is the listing's name. -->
    <h2 class="sr-only">
      {{ t('heading') }}
    </h2>

    <ProductsToolbar
      :total-results="totalResults"
      :current-sort="filters.sort"
      :items-per-page="limit"
      @update:sort="handleSortChange"
      @update:items-per-page="handleItemsPerPageChange"
      @toggle-filters="emit('toggle-filters')"
    />

    <!-- Shaped like the grid it replaces, so the page does not jump
         when the products land. -->
    <ol
      v-if="status === 'pending' && !products"
      :class="GRID_CLASS"
    >
      <ProductCardSkeleton
        v-for="i in limit"
        :key="i"
      />
    </ol>

    <UEmpty
      v-else-if="!products?.results?.length"
      icon="i-heroicons-magnifying-glass-minus"
      :title="t('products.no_results.title')"
      :description="emptyStateDescription"
      :actions="hasActiveFilters ? [
        {
          label: t('products.no_results.clear_filters'),
          size: 'lg',
          color: 'secondary',
          variant: 'solid',
          leadingIcon: 'i-heroicons-arrow-path',
          onClick: () => updateFilters(CLEARED_FILTERS),
        },
      ] : undefined"
    />

    <template v-else>
      <TransitionGroup
        name="product-fade"
        tag="ol"
        :class="GRID_CLASS"
      >
        <ProductCard
          v-for="(product, index) in products.results"
          :key="product.id"
          :img-loading="index > 7 ? 'lazy' : 'eager'"
          :product="product as unknown as Product"
        />
      </TransitionGroup>

      <ProductsPagination
        v-if="totalPages > 1"
        class="pt-4"
        :page="page"
        :total="totalResults"
        :items-per-page="limit"
        :to="pageLink"
        @update:page="handlePageChange"
      />
    </template>

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
.product-fade-enter-active {
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}

.product-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

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
