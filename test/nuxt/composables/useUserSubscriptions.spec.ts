import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { UserSubscription } from '#shared/openapi/types.gen'

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Use vi.hoisted to ensure mocks are available before mockNuxtImport is called
const { mockUseAsyncDataFn, mockRefreshNuxtDataFn, mockUseToastFn, mockUseNuxtAppFn } = vi.hoisted(() => ({
  mockUseAsyncDataFn: vi.fn(),
  mockRefreshNuxtDataFn: vi.fn(),
  mockUseToastFn: vi.fn(),
  mockUseNuxtAppFn: vi.fn(),
}))

// Mock Nuxt composables using mockNuxtImport
mockNuxtImport('useAsyncData', () => mockUseAsyncDataFn)
mockNuxtImport('useRequestHeaders', () => () => ({}))
mockNuxtImport('refreshNuxtData', () => mockRefreshNuxtDataFn)
mockNuxtImport('useToast', () => mockUseToastFn)
mockNuxtImport('useNuxtApp', () => mockUseNuxtAppFn)

describe('useUserSubscriptions Composable', () => {
  const mockToast = {
    add: vi.fn(),
  }

  const mockI18n = {
    t: vi.fn((key: string) => key),
  }

  beforeEach(() => {
    mockFetch.mockReset()
    mockUseAsyncDataFn.mockReset()
    mockRefreshNuxtDataFn.mockReset()
    mockToast.add.mockReset()
    mockI18n.t.mockReset()

    // Setup default mocks
    mockUseToastFn.mockReturnValue(mockToast)
    mockUseNuxtAppFn.mockReturnValue({ $i18n: mockI18n })
    mockRefreshNuxtDataFn.mockResolvedValue(undefined)
  })

  describe('fetchSubscriptions', () => {
    it('should call useAsyncData with correct cache key', () => {
      // Arrange
      mockUseAsyncDataFn.mockReturnValue({
        data: ref([]),
        status: ref('success'),
        error: ref(null),
        refresh: vi.fn(),
      })

      // Act
      const { fetchSubscriptions } = useUserSubscriptions()
      fetchSubscriptions()

      // Assert: Verify cache key follows the pattern
      expect(mockUseAsyncDataFn).toHaveBeenCalledWith(
        'subscription:user:list',
        expect.any(Function),
      )
    })

    it('should return AsyncData structure with data, status, error, and refresh', () => {
      // Arrange
      const mockSubscriptions: UserSubscription[] = [
        {
          id: 1,
          user: 1,
          topic: 1,
          topicDetails: {
            id: 1,
            uuid: 'uuid-1',
            slug: 'newsletter',
            translations: {
              el: {
                name: 'Newsletter',
                description: 'Weekly newsletter',
              },
            },
            category: 'NEWSLETTER',
            isActive: true,
            isDefault: false,
            requiresConfirmation: false,
            subscriberCount: 0,
          },
          status: 'ACTIVE',
          subscribedAt: '2024-01-01T00:00:00Z',
          unsubscribedAt: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ]

      mockUseAsyncDataFn.mockReturnValue({
        data: ref(mockSubscriptions),
        status: ref('success'),
        error: ref(null),
        refresh: vi.fn(),
      })

      // Act
      const { fetchSubscriptions } = useUserSubscriptions()
      const result = fetchSubscriptions()

      // Assert: Verify return structure
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('error')
      expect(result).toHaveProperty('refresh')

      expect(result.data.value).toEqual(mockSubscriptions)
      expect(result.status.value).toBe('success')
      expect(result.error.value).toBeNull()
    })

    it('should handle empty results array', () => {
      // Arrange
      mockUseAsyncDataFn.mockReturnValue({
        data: ref([]),
        status: ref('success'),
        error: ref(null),
        refresh: vi.fn(),
      })

      // Act
      const { fetchSubscriptions } = useUserSubscriptions()
      const result = fetchSubscriptions()

      // Assert
      expect(result.data.value).toEqual([])
      expect(result.status.value).toBe('success')
    })

    it('should handle error state', () => {
      // Arrange
      const mockError = new Error('Network error')
      mockUseAsyncDataFn.mockReturnValue({
        data: ref(null),
        status: ref('error'),
        error: ref(mockError),
        refresh: vi.fn(),
      })

      // Act
      const { fetchSubscriptions } = useUserSubscriptions()
      const result = fetchSubscriptions()

      // Assert
      expect(result.error.value).toBe(mockError)
      expect(result.status.value).toBe('error')
      expect(result.data.value).toBeNull()
    })

    it('should handle pending state', () => {
      // Arrange
      mockUseAsyncDataFn.mockReturnValue({
        data: ref(null),
        status: ref('pending'),
        error: ref(null),
        refresh: vi.fn(),
      })

      // Act
      const { fetchSubscriptions } = useUserSubscriptions()
      const result = fetchSubscriptions()

      // Assert
      expect(result.status.value).toBe('pending')
      expect(result.data.value).toBeNull()
      expect(result.error.value).toBeNull()
    })
  })

  describe('subscribe', () => {
    it('should successfully subscribe to a topic', async () => {
      // Arrange
      const topicId = 1
      const mockResponse = {
        id: 1,
        user: 1,
        topic: topicId,
        status: 'ACTIVE',
      }

      mockFetch.mockResolvedValue(mockResponse)

      // Act
      const { subscribe } = useUserSubscriptions()
      const result = await subscribe(topicId)

      // Assert: Verify API call
      expect(mockFetch).toHaveBeenCalledWith('/api/subscriptions/user', {
        method: 'POST',
        body: { topic: topicId },
      })

      // Assert: Verify cache invalidation
      expect(mockRefreshNuxtDataFn).toHaveBeenCalledTimes(2)
      expect(mockRefreshNuxtDataFn).toHaveBeenCalledWith('subscription:user:list')
      expect(mockRefreshNuxtDataFn).toHaveBeenCalledWith('subscription:topics:list')

      // Assert: Verify success toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: 'subscription_notifications.subscribe.success_title',
        description: 'subscription_notifications.subscribe.success_description',
        color: 'success',
      })

      // Assert: Verify return value
      expect(result).toEqual(mockResponse)
    })

    it('should handle subscription error and show error toast', async () => {
      // Arrange
      const topicId = 1
      const mockError = new Error('Subscription failed')
      mockFetch.mockRejectedValue(mockError)

      // Act & Assert
      const { subscribe } = useUserSubscriptions()
      await expect(subscribe(topicId)).rejects.toThrow('Subscription failed')

      // Assert: Verify error toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: 'subscription_notifications.subscribe.error_title',
        description: 'subscription_notifications.subscribe.error_description',
        color: 'error',
      })

      // Assert: Cache should not be invalidated on error
      expect(mockRefreshNuxtDataFn).not.toHaveBeenCalled()
    })

    it('should propagate error after showing toast', async () => {
      // Arrange
      const topicId = 1
      mockFetch.mockRejectedValue(new Error('Network error'))

      // Act & Assert
      const { subscribe } = useUserSubscriptions()
      await expect(subscribe(topicId)).rejects.toThrow('Network error')
    })
  })

  describe('unsubscribe', () => {
    it('should successfully unsubscribe from a topic', async () => {
      // Arrange
      const subscriptionId = 1
      mockFetch.mockResolvedValue(undefined)

      // Act
      const { unsubscribe } = useUserSubscriptions()
      await unsubscribe(subscriptionId)

      // Assert: Verify API call
      expect(mockFetch).toHaveBeenCalledWith(`/api/subscriptions/user/${subscriptionId}`, {
        method: 'DELETE',
      })

      // Assert: Verify cache invalidation
      expect(mockRefreshNuxtDataFn).toHaveBeenCalledTimes(2)
      expect(mockRefreshNuxtDataFn).toHaveBeenCalledWith('subscription:user:list')
      expect(mockRefreshNuxtDataFn).toHaveBeenCalledWith('subscription:topics:list')

      // Assert: Verify success toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: 'subscription_notifications.unsubscribe.success_title',
        description: 'subscription_notifications.unsubscribe.success_description',
        color: 'success',
      })
    })

    it('should handle unsubscribe error and show error toast', async () => {
      // Arrange
      const subscriptionId = 1
      const mockError = new Error('Unsubscribe failed')
      mockFetch.mockRejectedValue(mockError)

      // Act & Assert
      const { unsubscribe } = useUserSubscriptions()
      await expect(unsubscribe(subscriptionId)).rejects.toThrow('Unsubscribe failed')

      // Assert: Verify error toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: 'subscription_notifications.unsubscribe.error_title',
        description: 'subscription_notifications.unsubscribe.error_description',
        color: 'error',
      })

      // Assert: Cache should not be invalidated on error
      expect(mockRefreshNuxtDataFn).not.toHaveBeenCalled()
    })

    it('should propagate error after showing toast', async () => {
      // Arrange
      const subscriptionId = 1
      mockFetch.mockRejectedValue(new Error('Network error'))

      // Act & Assert
      const { unsubscribe } = useUserSubscriptions()
      await expect(unsubscribe(subscriptionId)).rejects.toThrow('Network error')
    })
  })

  describe('bulkSubscribe', () => {
    it('should successfully bulk subscribe to topics', async () => {
      // Arrange
      const topicIds = [1, 2, 3]
      const mockResponse = {
        success: true,
        subscribed: topicIds,
      }

      mockFetch.mockResolvedValue(mockResponse)

      // Act
      const { bulkSubscribe } = useUserSubscriptions()
      const result = await bulkSubscribe(topicIds, 'subscribe')

      // Assert: Verify API call
      expect(mockFetch).toHaveBeenCalledWith('/api/subscriptions/user/bulk-subscribe', {
        method: 'POST',
        body: { topicIds, action: 'subscribe' },
      })

      // Assert: Verify cache invalidation
      expect(mockRefreshNuxtDataFn).toHaveBeenCalledTimes(2)
      expect(mockRefreshNuxtDataFn).toHaveBeenCalledWith('subscription:user:list')
      expect(mockRefreshNuxtDataFn).toHaveBeenCalledWith('subscription:topics:list')

      // Assert: Verify success toast for subscribe
      expect(mockToast.add).toHaveBeenCalledWith({
        title: 'subscription_notifications.bulk_subscribe.success_title',
        description: 'subscription_notifications.bulk_subscribe.success_description',
        color: 'success',
      })

      // Assert: Verify return value
      expect(result).toEqual(mockResponse)
    })

    it('should successfully bulk unsubscribe from topics', async () => {
      // Arrange
      const topicIds = [1, 2, 3]
      const mockResponse = {
        success: true,
        unsubscribed: topicIds,
      }

      mockFetch.mockResolvedValue(mockResponse)

      // Act
      const { bulkSubscribe } = useUserSubscriptions()
      const result = await bulkSubscribe(topicIds, 'unsubscribe')

      // Assert: Verify API call
      expect(mockFetch).toHaveBeenCalledWith('/api/subscriptions/user/bulk-subscribe', {
        method: 'POST',
        body: { topicIds, action: 'unsubscribe' },
      })

      // Assert: Verify success toast for unsubscribe
      expect(mockToast.add).toHaveBeenCalledWith({
        title: 'subscription_notifications.bulk_unsubscribe.success_title',
        description: 'subscription_notifications.bulk_unsubscribe.success_description',
        color: 'success',
      })

      // Assert: Verify return value
      expect(result).toEqual(mockResponse)
    })

    it('should handle bulk operation error and show error toast', async () => {
      // Arrange
      const topicIds = [1, 2, 3]
      const mockError = new Error('Bulk operation failed')
      mockFetch.mockRejectedValue(mockError)

      // Act & Assert
      const { bulkSubscribe } = useUserSubscriptions()
      await expect(bulkSubscribe(topicIds, 'subscribe')).rejects.toThrow('Bulk operation failed')

      // Assert: Verify error toast
      expect(mockToast.add).toHaveBeenCalledWith({
        title: 'subscription_notifications.bulk_operation.error_title',
        description: 'subscription_notifications.bulk_operation.error_description',
        color: 'error',
      })

      // Assert: Cache should not be invalidated on error
      expect(mockRefreshNuxtDataFn).not.toHaveBeenCalled()
    })

    it('should propagate error after showing toast', async () => {
      // Arrange
      const topicIds = [1, 2, 3]
      mockFetch.mockRejectedValue(new Error('Network error'))

      // Act & Assert
      const { bulkSubscribe } = useUserSubscriptions()
      await expect(bulkSubscribe(topicIds, 'subscribe')).rejects.toThrow('Network error')
    })

    it('should handle empty topic IDs array', async () => {
      // Arrange
      const topicIds: number[] = []
      const mockResponse = { success: true, subscribed: [] }
      mockFetch.mockResolvedValue(mockResponse)

      // Act
      const { bulkSubscribe } = useUserSubscriptions()
      const result = await bulkSubscribe(topicIds, 'subscribe')

      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/subscriptions/user/bulk-subscribe', {
        method: 'POST',
        body: { topicIds: [], action: 'subscribe' },
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('Helper Functions', () => {
    describe('isSubscribed', () => {
      it('should return true when user is subscribed and active', () => {
        // Arrange
        const subscriptions: UserSubscription[] = [
          {
            id: 1,
            user: 1,
            topic: 1,
            topicDetails: {
              id: 1,
              uuid: 'uuid-1',
              slug: 'newsletter',
              translations: {
                el: {
                  name: 'Newsletter',
                  description: 'Weekly newsletter',
                },
              },
              category: 'NEWSLETTER',
              isActive: true,
              isDefault: false,
              requiresConfirmation: false,
              subscriberCount: 0,
            },
            status: 'ACTIVE',
            subscribedAt: '2024-01-01T00:00:00Z',
            unsubscribedAt: null,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ]

        // Act
        const { isSubscribed } = useUserSubscriptions()
        const result = isSubscribed(subscriptions, 1)

        // Assert
        expect(result).toBe(true)
      })

      it('should return false when user is subscribed but not active', () => {
        // Arrange
        const subscriptions: UserSubscription[] = [
          {
            id: 1,
            user: 1,
            topic: 1,
            topicDetails: {
              id: 1,
              uuid: 'uuid-1',
              slug: 'newsletter',
              translations: {
                el: {
                  name: 'Newsletter',
                  description: 'Weekly newsletter',
                },
              },
              category: 'NEWSLETTER',
              isActive: true,
              isDefault: false,
              requiresConfirmation: false,
              subscriberCount: 0,
            },
            status: 'UNSUBSCRIBED',
            subscribedAt: '2024-01-01T00:00:00Z',
            unsubscribedAt: '2024-01-02T00:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z',
          },
        ]

        // Act
        const { isSubscribed } = useUserSubscriptions()
        const result = isSubscribed(subscriptions, 1)

        // Assert
        expect(result).toBe(false)
      })

      it('should return false when topic is not in subscriptions', () => {
        // Arrange
        const subscriptions: UserSubscription[] = [
          {
            id: 1,
            user: 1,
            topic: 1,
            topicDetails: {
              id: 1,
              uuid: 'uuid-1',
              slug: 'newsletter',
              translations: {
                el: {
                  name: 'Newsletter',
                  description: 'Weekly newsletter',
                },
              },
              category: 'NEWSLETTER',
              isActive: true,
              isDefault: false,
              requiresConfirmation: false,
              subscriberCount: 0,
            },
            status: 'ACTIVE',
            subscribedAt: '2024-01-01T00:00:00Z',
            unsubscribedAt: null,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ]

        // Act
        const { isSubscribed } = useUserSubscriptions()
        const result = isSubscribed(subscriptions, 999)

        // Assert
        expect(result).toBe(false)
      })

      it('should return false when subscriptions is null', () => {
        // Act
        const { isSubscribed } = useUserSubscriptions()
        const result = isSubscribed(null, 1)

        // Assert
        expect(result).toBe(false)
      })

      it('should return false when subscriptions is empty array', () => {
        // Act
        const { isSubscribed } = useUserSubscriptions()
        const result = isSubscribed([], 1)

        // Assert
        expect(result).toBe(false)
      })
    })

    describe('getSubscriptionByTopicId', () => {
      it('should find subscription by topic id', () => {
        // Arrange
        const subscriptions: UserSubscription[] = [
          {
            id: 1,
            user: 1,
            topic: 1,
            topicDetails: {
              id: 1,
              uuid: 'uuid-1',
              slug: 'newsletter',
              translations: {
                el: {
                  name: 'Newsletter',
                  description: 'Weekly newsletter',
                },
              },
              category: 'NEWSLETTER',
              isActive: true,
              isDefault: false,
              requiresConfirmation: false,
              subscriberCount: 0,
            },
            status: 'ACTIVE',
            subscribedAt: '2024-01-01T00:00:00Z',
            unsubscribedAt: null,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 2,
            user: 1,
            topic: 2,
            topicDetails: {
              id: 2,
              uuid: 'uuid-2',
              slug: 'promotions',
              translations: {
                el: {
                  name: 'Promotions',
                  description: 'Special offers',
                },
              },
              category: 'PROMOTIONAL',
              isActive: true,
              isDefault: false,
              requiresConfirmation: false,
              subscriberCount: 0,
            },
            status: 'ACTIVE',
            subscribedAt: '2024-01-01T00:00:00Z',
            unsubscribedAt: null,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ]

        // Act
        const { getSubscriptionByTopicId } = useUserSubscriptions()
        const result = getSubscriptionByTopicId(subscriptions, 2)

        // Assert
        expect(result).toEqual(subscriptions[1])
      })

      it('should return undefined for non-existent topic id', () => {
        // Arrange
        const subscriptions: UserSubscription[] = [
          {
            id: 1,
            user: 1,
            topic: 1,
            topicDetails: {
              id: 1,
              uuid: 'uuid-1',
              slug: 'newsletter',
              translations: {
                el: {
                  name: 'Newsletter',
                  description: 'Weekly newsletter',
                },
              },
              category: 'NEWSLETTER',
              isActive: true,
              isDefault: false,
              requiresConfirmation: false,
              subscriberCount: 0,
            },
            status: 'ACTIVE',
            subscribedAt: '2024-01-01T00:00:00Z',
            unsubscribedAt: null,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ]

        // Act
        const { getSubscriptionByTopicId } = useUserSubscriptions()
        const result = getSubscriptionByTopicId(subscriptions, 999)

        // Assert
        expect(result).toBeUndefined()
      })

      it('should return undefined when subscriptions is null', () => {
        // Act
        const { getSubscriptionByTopicId } = useUserSubscriptions()
        const result = getSubscriptionByTopicId(null, 1)

        // Assert
        expect(result).toBeUndefined()
      })

      it('should return undefined when subscriptions is empty array', () => {
        // Act
        const { getSubscriptionByTopicId } = useUserSubscriptions()
        const result = getSubscriptionByTopicId([], 1)

        // Assert
        expect(result).toBeUndefined()
      })
    })
  })

  describe('Cache Invalidation', () => {
    it('should invalidate both user and topics caches after subscribe', async () => {
      // Arrange
      mockFetch.mockResolvedValue({ id: 1, topic: 1 })

      // Act
      const { subscribe } = useUserSubscriptions()
      await subscribe(1)

      // Assert: Verify both caches are invalidated
      expect(mockRefreshNuxtDataFn).toHaveBeenCalledTimes(2)
      expect(mockRefreshNuxtDataFn).toHaveBeenNthCalledWith(1, 'subscription:user:list')
      expect(mockRefreshNuxtDataFn).toHaveBeenNthCalledWith(2, 'subscription:topics:list')
    })

    it('should invalidate both user and topics caches after unsubscribe', async () => {
      // Arrange
      mockFetch.mockResolvedValue(undefined)

      // Act
      const { unsubscribe } = useUserSubscriptions()
      await unsubscribe(1)

      // Assert: Verify both caches are invalidated
      expect(mockRefreshNuxtDataFn).toHaveBeenCalledTimes(2)
      expect(mockRefreshNuxtDataFn).toHaveBeenNthCalledWith(1, 'subscription:user:list')
      expect(mockRefreshNuxtDataFn).toHaveBeenNthCalledWith(2, 'subscription:topics:list')
    })

    it('should invalidate both user and topics caches after bulk operation', async () => {
      // Arrange
      mockFetch.mockResolvedValue({ success: true })

      // Act
      const { bulkSubscribe } = useUserSubscriptions()
      await bulkSubscribe([1, 2, 3], 'subscribe')

      // Assert: Verify both caches are invalidated
      expect(mockRefreshNuxtDataFn).toHaveBeenCalledTimes(2)
      expect(mockRefreshNuxtDataFn).toHaveBeenNthCalledWith(1, 'subscription:user:list')
      expect(mockRefreshNuxtDataFn).toHaveBeenNthCalledWith(2, 'subscription:topics:list')
    })

    it('should not invalidate caches when mutation fails', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('API error'))

      // Act & Assert
      const { subscribe } = useUserSubscriptions()
      await expect(subscribe(1)).rejects.toThrow('API error')

      // Assert: Cache should not be invalidated
      expect(mockRefreshNuxtDataFn).not.toHaveBeenCalled()
    })
  })
})
