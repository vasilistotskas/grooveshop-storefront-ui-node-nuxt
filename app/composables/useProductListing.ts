/**
 * The product listing, apart from its drawing: the search the URL's
 * filters describe, one page of its products, the page and items-per-page
 * the shopper chose, the scroll that survives a change of sort or
 * density, the words for an empty result, and the shopper's favourites
 * among the products on screen.
 *
 * Shared by every drawing of the listing (`Products/List.vue` and the
 * tenants' own), so the request, its key and the page logic are decided
 * once. Call it from a `<script setup>`; it registers every lifecycle hook
 * before its one `await`, like every async composable here.
 */
export async function useProductListing(options: {
  /**
   * The category a category page is about. It is the PAGE context, not a
   * URL filter (the category lives in the route path, not `?category=`),
   * so it is merged into the search query rather than going through
   * `useProductFilters()`'s URL state. Absent on the store-wide listing.
   */
  categoryId: MaybeRefOrGetter<number | undefined>
}) {
  const route = useRoute()
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)
  const locale = computed(() => $i18n.locale.value)
  const { loggedIn, user } = useUserSession()
  const { updateFavouriteProducts } = useUserStore()
  const {
    filters,
    updateFilters,
    hasActiveFilters,
    activeFilterCount,
  } = useProductFilters()

  // Effective category set sent to the search API: the page's own category
  // (when on a category page) unioned with any category filters from the URL.
  // Deduplicated and reduced to the comma-joined string the API expects, or
  // undefined when there is no category constraint at all.
  const effectiveCategories = computed(() => {
    const cats = filters.value.categories.map(String)
    const categoryId = toValue(options.categoryId)
    if (categoryId != null) {
      const base = String(categoryId)
      if (!cats.includes(base)) cats.unshift(base)
    }
    return cats.length > 0 ? cats.join(',') : undefined
  })

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
      return t('products.no_results.no_filters')
    }

    // Build contextual suggestions based on active filters
    const suggestions: string[] = []

    if (filters.value.search) {
      suggestions.push(t('products.no_results.try_different_search'))
    }

    if (filters.value.priceMin !== undefined || filters.value.priceMax !== undefined) {
      suggestions.push(t('products.no_results.try_broader_price'))
    }

    if (filters.value.categories.length > 0) {
      suggestions.push(t('products.no_results.try_different_category'))
    }

    if (filters.value.likesMin !== undefined) {
      suggestions.push(t('products.no_results.try_lower_popularity'))
    }

    if (filters.value.viewsMin !== undefined) {
      suggestions.push(t('products.no_results.try_lower_views'))
    }

    if (filters.value.attributeValues.length > 0) {
      suggestions.push(t('products.no_results.try_different_attributes'))
    }

    if (filters.value.brands.length > 0) {
      suggestions.push(t('products.no_results.try_different_brands'))
    }

    if (filters.value.inStock || filters.value.onOffer) {
      suggestions.push(t('products.no_results.try_any_availability'))
    }

    // Return first suggestion or generic message
    if (suggestions.length > 0) {
      return suggestions[0]
    }

    return t('products.no_results.description')
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

  /** The URL a page control points at, so each one is a real link. */
  const pageLink = (target: number) => {
    const query = { ...route.query }
    if (target === 1) delete query.page
    else query.page = String(target)
    return { path: route.path, query }
  }

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

  // Fetch products with filters. Started here and awaited last: the hooks
  // below must be registered before the first `await`, or they lose their
  // component.
  const request = useApi<ProductMeiliSearchResponse>(
    '/api/products/search',
    {
      query: {
        query: computed(() => filters.value.search || undefined),
        priceMin: computed(() => filters.value.priceMin),
        priceMax: computed(() => filters.value.priceMax),
        likesMin: computed(() => filters.value.likesMin),
        viewsMin: computed(() => filters.value.viewsMin),
        categories: effectiveCategories,
        attributeValues: computed(() => filters.value.attributeValues.length > 0 ? filters.value.attributeValues.join(',') : undefined),
        brands: computed(() => filters.value.brands.length > 0 ? filters.value.brands.join(',') : undefined),
        inStock: computed(() => filters.value.inStock || undefined),
        onOffer: computed(() => filters.value.onOffer || undefined),
        sort: computed(() => filters.value.sort),
        languageCode: locale,
        limit,
        offset,
        facets: 'category,effective_price,likes_count,view_count,attribute_values',
      },
      // Only watch limit and offset - query params are already reactive
      watch: [limit, offset],
    },
  )
  const { data: products, status } = request

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

  // Handle sort changes from Toolbar
  const handleSortChange = async (value: string) => {
    // Save current scroll position before sort change
    savedScrollPosition.value = window.scrollY
    shouldPreserveScroll.value = true

    await updateFilters({ sort: value })

    // Restore scroll position after DOM updates (with small delta allowed)
    await nextTick(() => {
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
      attributeValues: filters.value.attributeValues.join(','), // Convert to string for proper comparison
      brands: filters.value.brands.join(','),
      inStock: filters.value.inStock,
      onOffer: filters.value.onOffer,
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

  // User-specific data: client-side only to avoid blocking SSR.
  //
  // The fetch trigger is deferred to ``onMounted`` — not called during
  // setup — because Nuxt's payload cache can resolve the request
  // synchronously on hydration (same key from a prior navigation). That
  // would populate the user store *before* Vue's hydration walk reaches
  // the heart buttons, producing a ``Hydration mismatch`` where SSR
  // rendered "add" and the client expected "remove". Vue logs the warning
  // in dev and **does not rectify the DOM in production**, so the heart
  // would stay grey forever on F5. Triggering in ``onMounted`` guarantees
  // the first client render matches SSR; the subsequent store update
  // patches the DOM normally through the usual reactive update path.
  const { data: favourites, execute: fetchFavourites } = useLazyApi('/api/products/favourites/favourites-by-products', {
    key: computed(() => `favouritesByProducts-${user.value?.id}-${productIds.value.join(',')}`),
    method: 'POST',
    body: {
      productIds,
    },
    immediate: false,
    // `watch: false` is required, not decorative: the reactive `key` and
    // the reactive `productIds` body are auto-watched, so every change to
    // the product list refetched this auth-required endpoint even for
    // anonymous visitors — `immediate` only gates the FIRST call.
    // Measured on staging: switching language on /products fired it and
    // took a 401. Same shape as the 2026-07-04 liked-posts incident; the
    // gated `watchEffect` below is the only thing that may trigger it.
    watch: false,
    server: false,
  })

  watch(favourites, (liked) => {
    if (liked) updateFavouriteProducts(liked)
  })

  onMounted(() => {
    // Re-enter reactivity with ``watchEffect`` after mount so we catch
    // both "already-true at mount" (user logged in + products loaded) and
    // "becomes true later" (user logs in mid-session, productIds populate
    // from SSR payload after hydration). Registering during setup with
    // ``immediate: true`` would race hydration — see the block comment on
    // ``useLazyFetch`` above.
    watchEffect(() => {
      if (shouldFetchFavouriteProducts.value) fetchFavourites()
    })
  })

  await request

  return {
    filters,
    updateFilters,
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
    pageLink,
    handlePageChange,
    handleSortChange,
    handleItemsPerPageChange,
  }
}
