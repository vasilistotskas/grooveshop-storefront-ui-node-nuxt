/**
 * Unit tests for useInstantSearch composable
 * Feature: data-fetching-migration
 * 
 * Tests the instant search composable including:
 * - URL initialization with watcher (no onMounted)
 * - Search execution with debouncing
 * - Request cancellation with AbortController
 * - URL synchronization
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { nextTick, ref } from 'vue'
import { useInstantSearch, type InstantSearchOptions } from '~/composables/useInstantSearch'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

// Mock router and route at module level
const mockRouteQuery = ref<Record<string, any>>({})

const mockRoute = {
  get query() {
    return mockRouteQuery.value
  },
}

const mockRouter = {
  replace: vi.fn(async (to: any) => {
    // Update the mock route query to simulate router behavior
    mockRouteQuery.value = to.query ? { ...to.query } : {}
    return Promise.resolve()
  }),
}

// Mock Nuxt composables at module level
mockNuxtImport('useRoute', () => () => mockRoute)
mockNuxtImport('useRouter', () => () => mockRouter)

describe('Feature: data-fetching-migration - useInstantSearch composable', () => {
  // Track all composable instances for cleanup
  const composableInstances: Array<{ cleanup?: () => void }> = []

  beforeEach(() => {
    // Reset mocks
    mockRouteQuery.value = {}
    mockRouter.replace.mockClear()
    vi.clearAllTimers()
    
    // Mock global $fetch with default empty response to prevent undefined errors
    global.$fetch = vi.fn().mockResolvedValue({
      results: [],
      estimatedTotalHits: 0,
    }) as any
  })

  afterEach(() => {
    // Clean up all composable instances
    composableInstances.forEach(instance => {
      if (instance.cleanup) {
        instance.cleanup()
      }
    })
    composableInstances.length = 0
    
    // Clean up timers
    vi.clearAllTimers()
    vi.useRealTimers()
    
    // Restore all mocks
    vi.restoreAllMocks()
  })

  // Helper function to create and track composable instances
  function createTrackedComposable<T>(options: InstantSearchOptions) {
    const instance = useInstantSearch<T>(options)
    composableInstances.push(instance)
    return instance
  }

  describe('14.3.1 Test URL initialization without onMounted', () => {
    it('should initialize search from URL query parameter using watcher', async () => {
      // Set initial URL query
      mockRouteQuery.value = { q: 'laptop' };
      
      // Mock successful search response - need to clear first since beforeEach sets a default
      (global.$fetch as any).mockClear();
      (global.$fetch as any).mockResolvedValueOnce({
        results: [{ id: 1, name: 'Laptop 1' }],
        estimatedTotalHits: 1,
      })

      // Create composable - watcher should trigger immediately with immediate: true
      const { searchQuery, results, isSearching } = createTrackedComposable({
        endpoint: 'products',
        languageCode: 'en',
      })

      // Wait for watcher to execute
      await nextTick()
      await vi.waitFor(() => expect(global.$fetch).toHaveBeenCalled(), { timeout: 1000 })

      // Verify search was executed with URL query
      expect(searchQuery.value).toBe('laptop')
      expect(global.$fetch).toHaveBeenCalledWith(
        '/api/products/search',
        expect.objectContaining({
          method: 'GET',
          query: expect.objectContaining({
            query: 'laptop',
          }),
        })
      )
    })

    it('should not execute search when URL query is empty', async () => {
      // No query in URL
      mockRouteQuery.value = {}

      const { searchQuery, results } = createTrackedComposable({
        endpoint: 'products',
        languageCode: 'en',
      })

      await nextTick()

      // No search should be executed
      expect(searchQuery.value).toBe('')
      expect(results.value).toEqual([])
      expect(global.$fetch).not.toHaveBeenCalled()
    })

    it('should handle URL changes reactively', async () => {
      mockRouteQuery.value = {};

      (global.$fetch as any).mockResolvedValue({
        results: [{ id: 1, name: 'Product 1' }],
        estimatedTotalHits: 1,
      })

      const { searchQuery, results } = createTrackedComposable({
        endpoint: 'products',
        languageCode: 'en',
      })

      await nextTick()

      // Change URL query (simulating browser back/forward)
      mockRouteQuery.value = { q: 'phone' }
      
      // Trigger the watcher manually since we're in a test environment
      await nextTick()
      await vi.waitFor(() => expect(searchQuery.value).toBe('phone'))

      // Verify search was executed with new query
      expect(global.$fetch).toHaveBeenCalledWith(
        '/api/products/search',
        expect.objectContaining({
          query: expect.objectContaining({
            query: 'phone',
          }),
        })
      )
    })
  })

  describe('14.3.2 Test search execution and debouncing', () => {
    it('should execute search with correct parameters', async () => {
      mockRouteQuery.value = {};

      (global.$fetch as any).mockResolvedValueOnce({
        results: [{ id: 1, name: 'Laptop 1' }],
        estimatedTotalHits: 1,
      })

      const { search } = createTrackedComposable({
        endpoint: 'products',
        languageCode: 'en',
        limit: 20,
      })

      await search('laptop')
      
      // Wait for debounce
      await vi.waitFor(() => expect(global.$fetch).toHaveBeenCalled())

      expect(global.$fetch).toHaveBeenCalledWith(
        '/api/products/search',
        expect.objectContaining({
          method: 'GET',
          query: {
            query: 'laptop',
            limit: 20,
            offset: 0,
            languageCode: 'en',
          },
        })
      )
    })

    it('should update URL when search is executed', async () => {
      mockRouteQuery.value = {}

      const { search } = createTrackedComposable({
        endpoint: 'products',
        languageCode: 'en',
      })

      await search('laptop')

      expect(mockRouter.replace).toHaveBeenCalledWith({
        query: { q: 'laptop' },
      })
    })

    it('should remove URL query when search is cleared', async () => {
      mockRouteQuery.value = { q: 'laptop' }

      const { search } = createTrackedComposable({
        endpoint: 'products',
        languageCode: 'en',
      })

      await search('')

      expect(mockRouter.replace).toHaveBeenCalledWith({
        query: {},
      })
    })

    it('should debounce search requests', async () => {
      vi.useFakeTimers()
      mockRouteQuery.value = {}; // Start with empty query to avoid watcher firing

      // Clear any previous calls and set up fresh mock
      (global.$fetch as any).mockClear();
      (global.$fetch as any).mockResolvedValue({
        results: [],
        estimatedTotalHits: 0,
      });

      const { search, cleanup } = useInstantSearch({
        endpoint: 'products',
        languageCode: 'en',
        debounceMs: 150,
      });

      // Clear the mock again to ensure clean slate (after watcher initialization)
      (global.$fetch as any).mockClear()

      // Execute multiple searches rapidly
      void search('l')
      void search('la')
      void search('lap')
      void search('lapt')
      void search('laptop')

      // Only the last search should be executed after debounce
      expect(global.$fetch).not.toHaveBeenCalled()

      // Fast-forward time
      await vi.advanceTimersByTimeAsync(150)

      // Now the search should be executed
      expect(global.$fetch).toHaveBeenCalledTimes(1)
      expect(global.$fetch).toHaveBeenCalledWith(
        '/api/products/search',
        expect.objectContaining({
          query: expect.objectContaining({
            query: 'laptop',
          }),
        })
      )

      // Cleanup
      if (cleanup) cleanup()
      vi.useRealTimers()
    })
  })

  describe('14.3.3 Test request cancellation', () => {
    it('should cancel previous request when new search is executed', async () => {
      mockRouteQuery.value = {}

      // Mock slow first request
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      
      // Clear previous calls and set up fresh mocks
      (global.$fetch as any).mockClear();
      (global.$fetch as any)
        .mockRejectedValueOnce(abortError)
        .mockResolvedValueOnce({
          results: [{ id: 2, name: 'Laptop 2' }],
          estimatedTotalHits: 1,
        })

      const { search, results } = createTrackedComposable({
        endpoint: 'products',
        languageCode: 'en',
        debounceMs: 0, // No debounce for this test
      })

      // Execute first search
      search('laptop')
      await nextTick()

      // Execute second search immediately (should cancel first)
      search('phone')
      await nextTick()

      await vi.waitFor(() => expect(global.$fetch).toHaveBeenCalledTimes(2))

      // Results should be from second search
      expect(results.value).toEqual([{ id: 2, name: 'Laptop 2' }])
    })

    it('should not update results when request is aborted', async () => {
      mockRouteQuery.value = {}

      const abortError = new Error('AbortError')
      abortError.name = 'AbortError';      
            (global.$fetch as any).mockRejectedValueOnce(abortError)

      const { search, results, isSearching } = createTrackedComposable({
        endpoint: 'products',
        languageCode: 'en',
        debounceMs: 0,
      })

      await search('laptop')
      await nextTick()

      // Results should remain empty
      expect(results.value).toEqual([])
      expect(isSearching.value).toBe(false)
    })
  })

  describe('14.3.4 Test error handling', () => {
    it('should handle search errors gracefully', async () => {
      mockRouteQuery.value = {};

      const searchError = new Error('Network error');
      (global.$fetch as any).mockRejectedValueOnce(searchError)

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { search, results } = createTrackedComposable({
        endpoint: 'products',
        languageCode: 'en',
        debounceMs: 0,
      })

      await search('laptop')
      await nextTick()
      await vi.waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled())

      // Error should be logged
      expect(consoleErrorSpy).toHaveBeenCalledWith('Search error:', searchError)

      // Results should be cleared
      expect(results.value).toEqual([])

      consoleErrorSpy.mockRestore()
    })

    it('should not log abort errors', async () => {
      mockRouteQuery.value = {}

      const abortError = new Error('AbortError')
      abortError.name = 'AbortError';
      
      // Clear previous calls and set up fresh mock
      (global.$fetch as any).mockClear();
      (global.$fetch as any).mockRejectedValueOnce(abortError)

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { search } = createTrackedComposable({
        endpoint: 'products',
        languageCode: 'en',
        debounceMs: 0,
      })

      await search('laptop')
      await nextTick()

      // Abort errors should not be logged
      expect(consoleErrorSpy).not.toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })
  })

  describe('14.3.5 Test clear functionality', () => {
    it('should clear search results and query', async () => {
      mockRouteQuery.value = { q: 'laptop' };

      // Clear previous calls and set up fresh mock
      (global.$fetch as any).mockClear();
      (global.$fetch as any).mockResolvedValueOnce({
        results: [{ id: 1, name: 'Laptop 1' }],
        estimatedTotalHits: 1,
      })

      const { searchQuery, results, clear, estimatedTotalHits } = createTrackedComposable({
        endpoint: 'products',
        languageCode: 'en',
      })

      await nextTick()
      await vi.waitFor(() => expect(results.value.length).toBeGreaterThan(0), { timeout: 1000 })

      // Clear search
      clear()

      expect(searchQuery.value).toBe('')
      expect(results.value).toEqual([])
      expect(estimatedTotalHits.value).toBe(0)
    })

    it('should remove URL query when cleared', async () => {
      mockRouteQuery.value = { q: 'laptop' }

      const { clear } = createTrackedComposable({
        endpoint: 'products',
        languageCode: 'en',
      })

      clear()

      expect(mockRouter.replace).toHaveBeenCalledWith({
        query: {},
      })
    })
  })

  describe('14.3.6 Test different endpoint types', () => {
    it('should use correct endpoint for products', async () => {
      mockRouteQuery.value = {};

      (global.$fetch as any).mockResolvedValueOnce({
        results: [],
        estimatedTotalHits: 0,
      })

      const { search } = createTrackedComposable({
        endpoint: 'products',
        languageCode: 'en',
      })

      await search('test')
      await vi.waitFor(() => expect(global.$fetch).toHaveBeenCalled())

      expect(global.$fetch).toHaveBeenCalledWith(
        '/api/products/search',
        expect.any(Object)
      )
    })

    it('should use correct endpoint for blog posts', async () => {
      mockRouteQuery.value = {};

      (global.$fetch as any).mockResolvedValueOnce({
        results: [],
        estimatedTotalHits: 0,
      })

      const { search } = createTrackedComposable({
        endpoint: 'blog-posts',
        languageCode: 'en',
      })

      await search('test')
      await vi.waitFor(() => expect(global.$fetch).toHaveBeenCalled())

      expect(global.$fetch).toHaveBeenCalledWith(
        '/api/blog/search',
        expect.any(Object)
      )
    })

    it('should use correct endpoint for federated search', async () => {
      mockRouteQuery.value = {};

      (global.$fetch as any).mockResolvedValueOnce({
        results: [],
        estimatedTotalHits: 0,
      })

      const { search } = createTrackedComposable({
        endpoint: 'federated',
        languageCode: 'en',
      })

      await search('test')
      await vi.waitFor(() => expect(global.$fetch).toHaveBeenCalled())

      expect(global.$fetch).toHaveBeenCalledWith(
        '/api/search/federated',
        expect.any(Object)
      )
    })
  })

  describe('14.3.7 Test reactive state updates', () => {
    it('should update isSearching state during search', async () => {
      mockRouteQuery.value = {};

      let resolveSearch: any
      const searchPromise = new Promise((resolve) => {
        resolveSearch = resolve
      });
      
      // Clear previous calls and set up fresh mock
      (global.$fetch as any).mockClear();
      (global.$fetch as any).mockReturnValueOnce(searchPromise)

      const { search, isSearching, cleanup } = useInstantSearch({
        endpoint: 'products',
        languageCode: 'en',
        debounceMs: 1, // Use 1ms instead of 0 to ensure debounce works
      })

      // Execute search
      search('laptop')
      
      // Wait for the debounced function to actually execute
      await new Promise(resolve => setTimeout(resolve, 10))

      // Should be searching
      expect(isSearching.value).toBe(true)

      // Resolve the search
      resolveSearch({
        results: [{ id: 1, name: 'Laptop 1' }],
        estimatedTotalHits: 1,
      })

      await vi.waitFor(() => expect(isSearching.value).toBe(false), { timeout: 100 })
      
      // Cleanup
      if (cleanup) cleanup()
    })

    it('should update results and estimatedTotalHits', async () => {
      mockRouteQuery.value = {};

      // Clear previous calls and set up fresh mock
      (global.$fetch as any).mockClear();
      (global.$fetch as any).mockResolvedValueOnce({
        results: [
          { id: 1, name: 'Laptop 1' },
          { id: 2, name: 'Laptop 2' },
        ],
        estimatedTotalHits: 42,
        facetDistribution: { category: { '1': 10, '2': 5 } },
        facetStats: { price: { min: 100, max: 2000 } },
      })

      const { search, results, estimatedTotalHits, facetDistribution, facetStats, cleanup } = useInstantSearch({
        endpoint: 'products',
        languageCode: 'en',
        debounceMs: 1, // Use 1ms instead of 0
      })

      await search('laptop')
      
      // Wait for the debounced search to execute and results to be populated
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(results.value).toHaveLength(2)
      expect(estimatedTotalHits.value).toBe(42)
      expect(facetDistribution.value).toEqual({ category: { '1': 10, '2': 5 } })
      expect(facetStats.value).toEqual({ price: { min: 100, max: 2000 } })
      
      // Cleanup
      if (cleanup) cleanup()
    })
  })
})


