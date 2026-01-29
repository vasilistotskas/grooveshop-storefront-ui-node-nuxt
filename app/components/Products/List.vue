<script lang="ts" setup>
const route = useRoute()
const { locale } = useI18n()
const { loggedIn, user } = useUserSession()
const userStore = useUserStore()
const { updateFavouriteProducts } = userStore
const { filters } = useProductFilters()

const limit = ref(20)
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
  return products.value.results?.map(product => product.id) || []
})

const shouldFetchFavouriteProducts = computed(() => {
  return loggedIn.value && productIds.value.length > 0
})

const totalResults = computed(() => products.value?.estimatedTotalHits || 0)
const totalPages = computed(() => Math.ceil(totalResults.value / limit.value))

// Reset page to 1 when filters change (excluding page itself)
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
    sort: filters.value.sort,
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
  <div class="flex w-full flex-col gap-4">
    <!-- Results count and sort -->
    <div class="flex items-center justify-between flex-wrap gap-2">
      <span class="text-sm text-gray-600 dark:text-gray-400">
        {{ $t('products.results_count', { count: totalResults }) }}
      </span>
      <div class="flex items-center gap-2">
        <ProductsFiltersSortSelect />
      </div>
    </div>

    <!-- Loading state -->
    <div
      v-if="status === 'pending' && !products"
      class="
        grid grid-cols-1 items-center justify-center gap-4
        sm:grid-cols-2
        md:grid-cols-3
        lg:grid-cols-3
        xl:grid-cols-4
      "
    >
      <USkeleton
        v-for="i in 8"
        :key="i"
        class="h-[457px] w-full"
      />
    </div>

    <!-- Empty state -->
    <div v-else-if="!products?.results?.length">
      <UCard>
        <div class="text-center py-12">
          <UIcon
            name="i-heroicons-magnifying-glass-minus"
            class="mx-auto size-16 text-gray-300 dark:text-gray-600"
          />
          <h3 class="mt-4 text-lg font-semibold">
            {{ $t('products.no_results.title') }}
          </h3>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            {{ $t('products.no_results.description') }}
          </p>
          <UButton
            class="mt-6"
            @click="() => useProductFilters().clearFilters()"
          >
            {{ $t('products.no_results.clear_filters') }}
          </UButton>
        </div>
      </UCard>
    </div>

    <!-- Product grid -->
    <template v-else>
      <ol
        class="
          grid grid-cols-1 items-center justify-center gap-4
          sm:grid-cols-2
          md:grid-cols-3
          lg:grid-cols-3
          xl:grid-cols-4
        "
      >
        <ProductCard
          v-for="(product, index) in products.results"
          :key="product.id"
          :img-loading="index > 7 ? 'lazy' : 'eager'"
          :product="product as unknown as Product"
        />
      </ol>

      <!-- Pagination -->
      <div
        v-if="totalPages > 1"
        class="flex justify-center pt-6"
      >
        <UPagination
          :page="page"
          :total="totalResults"
          :items-per-page="limit"
          show-first
          show-last
          :ui="{
            root: 'flex items-center gap-1',
          }"
          @update:page="handlePageChange"
        />
      </div>

      <!-- Items per page selector -->
      <div class="flex items-center justify-center gap-2 text-sm">
        <span class="text-gray-600 dark:text-gray-400">
          {{ $t('products.per_page') }}
        </span>
        <USelectMenu
          v-model="limit"
          :options="[12, 20, 24, 48]"
          size="sm"
          class="w-20"
          @update:model-value="() => handlePageChange(1)"
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
      {{ $t('products.results_count', { count: totalResults }) }}
    </div>
  </div>
</template>
