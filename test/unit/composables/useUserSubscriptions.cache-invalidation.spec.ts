/**
 * Property-Based Test: Mutation Cache Invalidation
 *
 * **Validates: Requirements 5.4, 6.2**
 *
 * This property test verifies that all mutation operations (subscribe, unsubscribe, bulkSubscribe)
 * in the useUserSubscriptions composable correctly invalidate related cache keys after successful
 * operations.
 *
 * Property: For any mutation operation that succeeds, refreshNuxtData() must be called with
 * the appropriate cache keys ('subscription:user:list' and 'subscription:topics:list').
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Create mock functions at module level
const mockRefreshNuxtData = vi.fn().mockResolvedValue(undefined)
const mockToastAdd = vi.fn()
const mockI18nT = vi.fn((key: string) => key)
const mockFetch = vi.fn()

// Mock Nuxt composables
vi.mock('#app', () => ({
  useNuxtApp: () => ({
    $i18n: {
      t: mockI18nT,
    },
  }),
  useRequestHeaders: () => ({}),
  useToast: () => ({
    add: mockToastAdd,
  }),
  refreshNuxtData: mockRefreshNuxtData,
}))

// Mock global functions
vi.stubGlobal('useToast', () => ({
  add: mockToastAdd,
}))
vi.stubGlobal('useNuxtApp', () => ({
  $i18n: {
    t: mockI18nT,
  },
}))
vi.stubGlobal('useRequestHeaders', () => ({}))
vi.stubGlobal('refreshNuxtData', mockRefreshNuxtData)

// Mock global $fetch
vi.stubGlobal('$fetch', mockFetch)

describe('useUserSubscriptions - Property: Mutation Cache Invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  describe('Property: subscribe() invalidates both cache keys on success', () => {
    it('should invalidate subscription:user:list and subscription:topics:list', async () => {
      // Test with various topic IDs
      const topicIds = [1, 42, 100, 999, 5000]

      for (const topicId of topicIds) {
        mockRefreshNuxtData.mockClear()
        mockFetch.mockClear()

        // Mock successful API response
        mockFetch.mockResolvedValueOnce({
          id: Math.floor(Math.random() * 10000),
          topic: topicId,
          status: 'ACTIVE',
        })

        const { useUserSubscriptions } = await import('~/composables/useUserSubscriptions')
        const { subscribe } = useUserSubscriptions()

        // Execute the mutation
        await subscribe(topicId)

        // Verify refreshNuxtData was called with both cache keys
        expect(mockRefreshNuxtData).toHaveBeenCalledTimes(2)
        expect(mockRefreshNuxtData).toHaveBeenCalledWith('subscription:user:list')
        expect(mockRefreshNuxtData).toHaveBeenCalledWith('subscription:topics:list')
      }
    })
  })

  describe('Property: unsubscribe() invalidates both cache keys on success', () => {
    it('should invalidate subscription:user:list and subscription:topics:list', async () => {
      // Test with various subscription IDs
      const subscriptionIds = [1, 25, 100, 500, 9999]

      for (const subscriptionId of subscriptionIds) {
        mockRefreshNuxtData.mockClear()
        mockFetch.mockClear()

        // Mock successful API response (DELETE returns void)
        mockFetch.mockResolvedValueOnce(undefined)

        const { useUserSubscriptions } = await import('~/composables/useUserSubscriptions')
        const { unsubscribe } = useUserSubscriptions()

        // Execute the mutation
        await unsubscribe(subscriptionId)

        // Verify refreshNuxtData was called with both cache keys
        expect(mockRefreshNuxtData).toHaveBeenCalledTimes(2)
        expect(mockRefreshNuxtData).toHaveBeenCalledWith('subscription:user:list')
        expect(mockRefreshNuxtData).toHaveBeenCalledWith('subscription:topics:list')
      }
    })
  })

  describe('Property: bulkSubscribe() invalidates both cache keys on success', () => {
    it('should invalidate subscription:user:list and subscription:topics:list for subscribe action', async () => {
      // Test with various topic ID arrays
      const testCases = [
        [1],
        [1, 2, 3],
        [10, 20, 30, 40, 50],
        [100, 200],
      ]

      for (const topicIds of testCases) {
        mockRefreshNuxtData.mockClear()
        mockFetch.mockClear()

        // Mock successful API response
        mockFetch.mockResolvedValueOnce({
          success: true,
          count: topicIds.length,
        })

        const { useUserSubscriptions } = await import('~/composables/useUserSubscriptions')
        const { bulkSubscribe } = useUserSubscriptions()

        // Execute the mutation
        await bulkSubscribe(topicIds, 'subscribe')

        // Verify refreshNuxtData was called with both cache keys
        expect(mockRefreshNuxtData).toHaveBeenCalledTimes(2)
        expect(mockRefreshNuxtData).toHaveBeenCalledWith('subscription:user:list')
        expect(mockRefreshNuxtData).toHaveBeenCalledWith('subscription:topics:list')
      }
    })

    it('should invalidate subscription:user:list and subscription:topics:list for unsubscribe action', async () => {
      // Test with various topic ID arrays
      const testCases = [
        [1],
        [5, 10],
        [1, 2, 3, 4],
      ]

      for (const topicIds of testCases) {
        mockRefreshNuxtData.mockClear()
        mockFetch.mockClear()

        // Mock successful API response
        mockFetch.mockResolvedValueOnce({
          success: true,
          count: topicIds.length,
        })

        const { useUserSubscriptions } = await import('~/composables/useUserSubscriptions')
        const { bulkSubscribe } = useUserSubscriptions()

        // Execute the mutation
        await bulkSubscribe(topicIds, 'unsubscribe')

        // Verify refreshNuxtData was called with both cache keys
        expect(mockRefreshNuxtData).toHaveBeenCalledTimes(2)
        expect(mockRefreshNuxtData).toHaveBeenCalledWith('subscription:user:list')
        expect(mockRefreshNuxtData).toHaveBeenCalledWith('subscription:topics:list')
      }
    })
  })

  describe('Property: mutations do NOT invalidate cache on failure', () => {
    it('subscribe() should not call refreshNuxtData when API fails', async () => {
      const topicIds = [1, 50, 100]

      for (const topicId of topicIds) {
        mockRefreshNuxtData.mockClear()
        mockFetch.mockClear()

        // Mock API failure
        mockFetch.mockRejectedValueOnce(new Error('API Error'))

        const { useUserSubscriptions } = await import('~/composables/useUserSubscriptions')
        const { subscribe } = useUserSubscriptions()

        // Execute the mutation and expect it to throw
        await expect(subscribe(topicId)).rejects.toThrow()

        // Verify refreshNuxtData was NOT called
        expect(mockRefreshNuxtData).not.toHaveBeenCalled()
      }
    })

    it('unsubscribe() should not call refreshNuxtData when API fails', async () => {
      const subscriptionIds = [1, 50, 100]

      for (const subscriptionId of subscriptionIds) {
        mockRefreshNuxtData.mockClear()
        mockFetch.mockClear()

        // Mock API failure
        mockFetch.mockRejectedValueOnce(new Error('API Error'))

        const { useUserSubscriptions } = await import('~/composables/useUserSubscriptions')
        const { unsubscribe } = useUserSubscriptions()

        // Execute the mutation and expect it to throw
        await expect(unsubscribe(subscriptionId)).rejects.toThrow()

        // Verify refreshNuxtData was NOT called
        expect(mockRefreshNuxtData).not.toHaveBeenCalled()
      }
    })

    it('bulkSubscribe() should not call refreshNuxtData when API fails', async () => {
      const testCases: Array<{ topicIds: number[], action: 'subscribe' | 'unsubscribe' }> = [
        { topicIds: [1, 2], action: 'subscribe' },
        { topicIds: [10, 20, 30], action: 'unsubscribe' },
      ]

      for (const { topicIds, action } of testCases) {
        mockRefreshNuxtData.mockClear()
        mockFetch.mockClear()

        // Mock API failure
        mockFetch.mockRejectedValueOnce(new Error('API Error'))

        const { useUserSubscriptions } = await import('~/composables/useUserSubscriptions')
        const { bulkSubscribe } = useUserSubscriptions()

        // Execute the mutation and expect it to throw
        await expect(bulkSubscribe(topicIds, action)).rejects.toThrow()

        // Verify refreshNuxtData was NOT called
        expect(mockRefreshNuxtData).not.toHaveBeenCalled()
      }
    })
  })

  describe('Property: cache invalidation happens in correct order', () => {
    it('should call refreshNuxtData after API call completes, not before', async () => {
      const topicIds = [1, 50, 100]

      for (const topicId of topicIds) {
        mockRefreshNuxtData.mockClear()
        mockFetch.mockClear()

        const callOrder: string[] = []

        // Track call order
        mockFetch.mockImplementation(async () => {
          callOrder.push('fetch')
          return { id: 1, topic: topicId, status: 'ACTIVE' }
        })

        mockRefreshNuxtData.mockImplementation(async (key: string) => {
          callOrder.push(`refresh:${key}`)
        })

        const { useUserSubscriptions } = await import('~/composables/useUserSubscriptions')
        const { subscribe } = useUserSubscriptions()

        // Execute the mutation
        await subscribe(topicId)

        // Verify order: fetch happens first, then cache invalidation
        expect(callOrder[0]).toBe('fetch')
        expect(callOrder[1]).toMatch(/^refresh:/)
        expect(callOrder[2]).toMatch(/^refresh:/)
      }
    })
  })
})
