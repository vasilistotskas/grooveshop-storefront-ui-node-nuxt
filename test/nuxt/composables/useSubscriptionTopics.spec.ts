import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { SubscriptionTopic } from '#shared/openapi/types.gen'
import { createMockTopic } from '../../helpers/subscriptionTestData'

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Use vi.hoisted to ensure mocks are available before mockNuxtImport is called
const { mockUseAsyncDataFn } = vi.hoisted(() => ({
  mockUseAsyncDataFn: vi.fn(),
}))

// Mock Nuxt composables using mockNuxtImport
mockNuxtImport('useAsyncData', () => mockUseAsyncDataFn)
mockNuxtImport('useRequestHeaders', () => () => ({}))

describe('useSubscriptionTopics Composable', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockUseAsyncDataFn.mockReset()
  })

  describe('Property 1: Composable Return Structure Consistency', () => {
    /**
     * **Validates: Requirements 2.2, 5.2**
     * 
     * For any custom composable that performs data fetching using `useAsyncData` or `useFetch`,
     * the returned object should contain the properties `data`, `status`, `error`, and `refresh`
     * with the correct types.
     * 
     * This ensures that all migrated composables follow the standard Nuxt pattern and provide
     * a consistent API for components to consume.
     */
    it('should return object with data, status, error, and refresh properties', () => {
      // Arrange: Mock useAsyncData to return the standard AsyncData structure
      const mockData = ref<SubscriptionTopic[]>([
        createMockTopic({
          id: 1,
          category: 'MARKETING',
        }),
      ])
      const mockStatus = ref<'idle' | 'pending' | 'success' | 'error'>('success')
      const mockError = ref<Error | null>(null)
      const mockRefresh = vi.fn()

      mockUseAsyncDataFn.mockReturnValue({
        data: mockData,
        status: mockStatus,
        error: mockError,
        refresh: mockRefresh,
      })

      // Act: Call the composable method
      const { fetchTopics } = useSubscriptionTopics()
      const result = fetchTopics()

      // Assert: Verify the return structure has all required properties
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('error')
      expect(result).toHaveProperty('refresh')

      // Assert: Verify the types are correct
      expect(result.data).toBeTypeOf('object') // Ref is an object
      expect(result.status).toBeTypeOf('object') // Ref is an object
      expect(result.error).toBeTypeOf('object') // Ref is an object
      expect(result.refresh).toBeTypeOf('function')

      // Assert: Verify the values are accessible via .value
      expect(result.data.value).toEqual(mockData.value)
      expect(result.status.value).toBe('success')
      expect(result.error.value).toBeNull()
    })

    it('should return consistent structure with error state', () => {
      // Arrange: Mock useAsyncData with error state
      const mockError = new Error('Network error')
      mockUseAsyncDataFn.mockReturnValue({
        data: ref(null),
        status: ref('error'),
        error: ref(mockError),
        refresh: vi.fn(),
      })

      // Act
      const { fetchTopics } = useSubscriptionTopics()
      const result = fetchTopics()

      // Assert: Structure is consistent even in error state
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('error')
      expect(result).toHaveProperty('refresh')

      expect(result.status.value).toBe('error')
      expect(result.error.value).toBe(mockError)
      expect(result.data.value).toBeNull()
    })

    it('should return consistent structure with pending state', () => {
      // Arrange: Mock useAsyncData with pending state
      mockUseAsyncDataFn.mockReturnValue({
        data: ref(null),
        status: ref('pending'),
        error: ref(null),
        refresh: vi.fn(),
      })

      // Act
      const { fetchTopics } = useSubscriptionTopics()
      const result = fetchTopics()

      // Assert: Structure is consistent in pending state
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('error')
      expect(result).toHaveProperty('refresh')

      expect(result.status.value).toBe('pending')
      expect(result.error.value).toBeNull()
      expect(result.data.value).toBeNull()
    })

    it('should return consistent structure with idle state', () => {
      // Arrange: Mock useAsyncData with idle state
      mockUseAsyncDataFn.mockReturnValue({
        data: ref(null),
        status: ref('idle'),
        error: ref(null),
        refresh: vi.fn(),
      })

      // Act
      const { fetchTopics } = useSubscriptionTopics()
      const result = fetchTopics()

      // Assert: Structure is consistent in idle state
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('error')
      expect(result).toHaveProperty('refresh')

      expect(result.status.value).toBe('idle')
      expect(result.error.value).toBeNull()
      expect(result.data.value).toBeNull()
    })

    it('should have refresh function that is callable', () => {
      // Arrange
      const mockRefresh = vi.fn().mockResolvedValue(undefined)
      mockUseAsyncDataFn.mockReturnValue({
        data: ref([]),
        status: ref('success'),
        error: ref(null),
        refresh: mockRefresh,
      })

      // Act
      const { fetchTopics } = useSubscriptionTopics()
      const result = fetchTopics()

      // Assert: refresh is a function and can be called
      expect(typeof result.refresh).toBe('function')
      result.refresh()
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })
  })

  describe('fetchTopics', () => {
    it('should call useAsyncData with correct cache key', () => {
      // Arrange
      mockUseAsyncDataFn.mockReturnValue({
        data: ref([]),
        status: ref('success'),
        error: ref(null),
        refresh: vi.fn(),
      })

      // Act
      const { fetchTopics } = useSubscriptionTopics()
      fetchTopics()

      // Assert: Verify cache key follows the pattern
      expect(mockUseAsyncDataFn).toHaveBeenCalledWith(
        'subscription:topics:list',
        expect.any(Function),
      )
    })

    it('should handle successful data fetching', () => {
      // Arrange
      const mockTopics: SubscriptionTopic[] = [
        createMockTopic({
          id: 1,
          slug: 'newsletter',
          category: 'NEWSLETTER',
          translations: {
            el: {
              name: 'Newsletter',
              description: 'Weekly newsletter',
            },
          },
        }),
        createMockTopic({
          id: 2,
          slug: 'promotions',
          category: 'PROMOTIONAL',
          translations: {
            el: {
              name: 'Promotions',
              description: 'Special offers',
            },
          },
        }),
      ]

      mockUseAsyncDataFn.mockReturnValue({
        data: ref(mockTopics),
        status: ref('success'),
        error: ref(null),
        refresh: vi.fn(),
      })

      // Act
      const { fetchTopics } = useSubscriptionTopics()
      const result = fetchTopics()

      // Assert
      expect(result.data.value).toEqual(mockTopics)
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
      const { fetchTopics } = useSubscriptionTopics()
      const result = fetchTopics()

      // Assert
      expect(result.data.value).toEqual([])
      expect(result.status.value).toBe('success')
    })
  })

  describe('Helper Functions', () => {
    describe('getTopicById', () => {
      it('should find topic by id', () => {
        // Arrange
        const topics: SubscriptionTopic[] = [
          createMockTopic({ id: 1, slug: 'topic-1' }),
          createMockTopic({ id: 2, slug: 'topic-2' }),
        ]

        // Act
        const { getTopicById } = useSubscriptionTopics()
        const result = getTopicById(topics, 2)

        // Assert
        expect(result).toEqual(topics[1])
      })

      it('should return undefined for non-existent id', () => {
        // Arrange
        const topics: SubscriptionTopic[] = [
          createMockTopic({ id: 1 }),
        ]

        // Act
        const { getTopicById } = useSubscriptionTopics()
        const result = getTopicById(topics, 999)

        // Assert
        expect(result).toBeUndefined()
      })

      it('should handle null topics array', () => {
        // Act
        const { getTopicById } = useSubscriptionTopics()
        const result = getTopicById(null, 1)

        // Assert
        expect(result).toBeUndefined()
      })

      it('should handle empty topics array', () => {
        // Act
        const { getTopicById } = useSubscriptionTopics()
        const result = getTopicById([], 1)

        // Assert
        expect(result).toBeUndefined()
      })
    })

    describe('groupByCategory', () => {
      it('should group topics by category', () => {
        // Arrange
        const topics: SubscriptionTopic[] = [
          createMockTopic({ id: 1, category: 'NEWSLETTER' }),
          createMockTopic({ id: 2, category: 'PROMOTIONAL' }),
          createMockTopic({ id: 3, category: 'NEWSLETTER' }),
        ]

        // Act
        const { groupByCategory } = useSubscriptionTopics()
        const result = groupByCategory(topics)

        // Assert
        expect(result).toHaveProperty('NEWSLETTER')
        expect(result).toHaveProperty('PROMOTIONAL')
        expect(result.NEWSLETTER).toHaveLength(2)
        expect(result.PROMOTIONAL).toHaveLength(1)
        expect(result.NEWSLETTER).toContain(topics[0])
        expect(result.NEWSLETTER).toContain(topics[2])
        expect(result.PROMOTIONAL).toContain(topics[1])
      })

      it('should handle topics without category', () => {
        // Arrange
        const topics: SubscriptionTopic[] = [
          createMockTopic({ id: 1, category: undefined }),
        ]

        // Act
        const { groupByCategory } = useSubscriptionTopics()
        const result = groupByCategory(topics)

        // Assert
        expect(result).toHaveProperty('OTHER')
        expect(result.OTHER).toHaveLength(1)
        expect(result.OTHER).toContain(topics[0])
      })

      it('should handle null topics array', () => {
        // Act
        const { groupByCategory } = useSubscriptionTopics()
        const result = groupByCategory(null)

        // Assert
        expect(result).toEqual({})
      })

      it('should handle empty topics array', () => {
        // Act
        const { groupByCategory } = useSubscriptionTopics()
        const result = groupByCategory([])

        // Assert
        expect(result).toEqual({})
      })

      it('should handle mixed categories including undefined', () => {
        // Arrange
        const topics: SubscriptionTopic[] = [
          createMockTopic({ id: 1, category: 'NEWSLETTER' }),
          createMockTopic({ id: 2, category: undefined }),
          createMockTopic({ id: 3, category: 'NEWSLETTER' }),
          createMockTopic({ id: 4, category: undefined }),
        ]

        // Act
        const { groupByCategory } = useSubscriptionTopics()
        const result = groupByCategory(topics)

        // Assert
        expect(result).toHaveProperty('NEWSLETTER')
        expect(result).toHaveProperty('OTHER')
        expect(result.NEWSLETTER).toHaveLength(2)
        expect(result.OTHER).toHaveLength(2)
      })
    })
  })
})
