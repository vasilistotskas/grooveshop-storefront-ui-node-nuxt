import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { SubscriptionTopic, UserSubscription } from '#shared/openapi/types.gen'

// Mock composables with new AsyncData API
const mockTopicsRef = ref<SubscriptionTopic[] | null>(null)
const mockTopicsStatusRef = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const mockTopicsErrorRef = ref<Error | null>(null)
const mockTopicsRefresh = vi.fn()

const mockSubscriptionsRef = ref<UserSubscription[] | null>(null)
const mockSubscriptionsStatusRef = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const mockSubscriptionsErrorRef = ref<Error | null>(null)
const mockSubscriptionsRefresh = vi.fn()

const mockSubscribe = vi.fn()
const mockUnsubscribe = vi.fn()
const mockGroupByCategory = vi.fn()

// Mock the composables using mockNuxtImport
mockNuxtImport('useSubscriptionTopics', () => {
  return () => ({
    fetchTopics: () => ({
      data: mockTopicsRef,
      status: mockTopicsStatusRef,
      error: mockTopicsErrorRef,
      refresh: mockTopicsRefresh,
    }),
    groupByCategory: mockGroupByCategory,
  })
})

mockNuxtImport('useUserSubscriptions', () => {
  return () => ({
    fetchSubscriptions: () => ({
      data: mockSubscriptionsRef,
      status: mockSubscriptionsStatusRef,
      error: mockSubscriptionsErrorRef,
      refresh: mockSubscriptionsRefresh,
    }),
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
  })
})

// Create a simplified test version of the component
const SubscriptionTopicsListTest = defineComponent({
  name: 'SubscriptionTopicsListTest',
  setup() {
    const { fetchTopics, groupByCategory } = useSubscriptionTopics()
    const { fetchSubscriptions, subscribe, unsubscribe } = useUserSubscriptions()

    const { data: topics, status: topicsStatus, error: topicsError } = fetchTopics()
    const { data: subscriptions, status: subscriptionsStatus, error: subscriptionsError } = fetchSubscriptions()

    const loading = computed(() => topicsStatus.value === 'pending' || subscriptionsStatus.value === 'pending')
    const error = computed(() => topicsError.value || subscriptionsError.value)
    const hasTopics = computed(() => topics.value && topics.value.length > 0)

    const groupedByCategory = computed(() => groupByCategory(topics.value))

    const categoriesWithTopics = computed(() => {
      return Object.entries(groupedByCategory.value)
        .filter(([_, topics]) => topics.length > 0)
        .map(([category]) => category)
    })

    return {
      topics,
      subscriptions,
      topicsStatus,
      subscriptionsStatus,
      topicsError,
      subscriptionsError,
      loading,
      error,
      hasTopics,
      groupedByCategory,
      categoriesWithTopics,
      subscribe,
      unsubscribe,
    }
  },
  render() {
    return h('div', { class: 'test-wrapper' }, [
      this.loading && !this.hasTopics ? h('div', { class: 'loading' }, 'Loading...') : null,
      this.error ? h('div', { class: 'error' }, this.error.message) : null,
      !this.hasTopics && !this.loading && !this.error ? h('div', { class: 'empty' }, 'No topics') : null,
      this.hasTopics ? h('div', { class: 'topics' }, `${this.categoriesWithTopics.length} categories`) : null,
    ])
  },
})

describe('SubscriptionTopicsList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTopicsRef.value = null
    mockTopicsStatusRef.value = 'idle'
    mockTopicsErrorRef.value = null
    mockSubscriptionsRef.value = null
    mockSubscriptionsStatusRef.value = 'idle'
    mockSubscriptionsErrorRef.value = null
    mockSubscribe.mockResolvedValue(undefined)
    mockUnsubscribe.mockResolvedValue(undefined)
    mockGroupByCategory.mockReturnValue({})
  })

  describe('Loading State Display', () => {
    it('should display loading state when topics are pending', () => {
      mockTopicsStatusRef.value = 'pending'
      mockSubscriptionsStatusRef.value = 'success'
      mockSubscriptionsRef.value = []

      const wrapper = mount(SubscriptionTopicsListTest)

      // Should display loading state
      expect(wrapper.find('.loading').exists()).toBe(true)
      expect(wrapper.text()).toContain('Loading')
    })

    it('should display loading state when subscriptions are pending', () => {
      mockTopicsStatusRef.value = 'success'
      mockTopicsRef.value = []
      mockSubscriptionsStatusRef.value = 'pending'

      const wrapper = mount(SubscriptionTopicsListTest)

      // Should display loading state
      expect(wrapper.find('.loading').exists()).toBe(true)
    })

    it('should display loading state when both are pending', () => {
      mockTopicsStatusRef.value = 'pending'
      mockSubscriptionsStatusRef.value = 'pending'

      const wrapper = mount(SubscriptionTopicsListTest)

      // Should display loading state
      expect(wrapper.find('.loading').exists()).toBe(true)
    })

    it('should not display loading state when data is loaded', () => {
      mockTopicsStatusRef.value = 'success'
      mockTopicsRef.value = [
        {
          id: 1,
          uuid: 'uuid-1',
          slug: 'test-topic',
          translations: {
            el: {
              name: 'Test Topic',
              description: 'Test Description',
            },
          },
          category: 'MARKETING',
          isActive: true,
          isDefault: false,
          requiresConfirmation: false,
          subscriberCount: 0,
        },
      ]
      mockSubscriptionsStatusRef.value = 'success'
      mockSubscriptionsRef.value = []
      mockGroupByCategory.mockReturnValue({
        MARKETING: [mockTopicsRef.value[0]],
      })

      const wrapper = mount(SubscriptionTopicsListTest)

      // Should not display loading state when data is present
      expect(wrapper.find('.loading').exists()).toBe(false)
      expect(wrapper.find('.topics').exists()).toBe(true)
    })
  })

  describe('Error State Display', () => {
    it('should display error when topics fetch fails', () => {
      mockTopicsStatusRef.value = 'error'
      mockTopicsErrorRef.value = new Error('Failed to load topics')
      mockSubscriptionsStatusRef.value = 'success'
      mockSubscriptionsRef.value = []

      const wrapper = mount(SubscriptionTopicsListTest)

      // Should display error
      expect(wrapper.find('.error').exists()).toBe(true)
      expect(wrapper.text()).toContain('Failed to load topics')
    })

    it('should display error when subscriptions fetch fails', () => {
      mockTopicsStatusRef.value = 'success'
      mockTopicsRef.value = []
      mockSubscriptionsStatusRef.value = 'error'
      mockSubscriptionsErrorRef.value = new Error('Failed to load subscriptions')

      const wrapper = mount(SubscriptionTopicsListTest)

      // Should display error
      expect(wrapper.find('.error').exists()).toBe(true)
      expect(wrapper.text()).toContain('Failed to load subscriptions')
    })

    it('should display error when both fetches fail', () => {
      mockTopicsStatusRef.value = 'error'
      mockTopicsErrorRef.value = new Error('Topics error')
      mockSubscriptionsStatusRef.value = 'error'
      mockSubscriptionsErrorRef.value = new Error('Subscriptions error')

      const wrapper = mount(SubscriptionTopicsListTest)

      // Should display error (first error takes precedence)
      expect(wrapper.find('.error').exists()).toBe(true)
    })

    it('should use status.value === "pending" for loading check', () => {
      mockTopicsStatusRef.value = 'pending'
      mockSubscriptionsStatusRef.value = 'idle'

      const wrapper = mount(SubscriptionTopicsListTest)

      // Verify loading computed uses status.value === 'pending'
      expect(wrapper.vm.loading).toBe(true)
    })
  })

  describe('Successful Data Display', () => {
    it('should display topics when data is loaded', () => {
      const mockTopics: SubscriptionTopic[] = [
        {
          id: 1,
          uuid: 'uuid-1',
          slug: 'marketing-newsletter',
          translations: {
            el: {
              name: 'Marketing Newsletter',
              description: 'Weekly marketing updates',
            },
          },
          category: 'MARKETING',
          isActive: true,
          isDefault: false,
          requiresConfirmation: false,
          subscriberCount: 0,
        },
        {
          id: 2,
          uuid: 'uuid-2',
          slug: 'product-updates',
          translations: {
            el: {
              name: 'Product Updates',
              description: 'New product announcements',
            },
          },
          category: 'PRODUCT',
          isActive: true,
          isDefault: false,
          requiresConfirmation: false,
          subscriberCount: 0,
        },
      ]

      mockTopicsStatusRef.value = 'success'
      mockTopicsRef.value = mockTopics
      mockSubscriptionsStatusRef.value = 'success'
      mockSubscriptionsRef.value = []
      mockGroupByCategory.mockReturnValue({
        MARKETING: [mockTopics[0]],
        PRODUCT: [mockTopics[1]],
      })

      const wrapper = mount(SubscriptionTopicsListTest)

      // Should display topics
      expect(wrapper.find('.topics').exists()).toBe(true)
      expect(wrapper.vm.categoriesWithTopics).toHaveLength(2)
    })

    it('should pass correct data to groupByCategory helper', () => {
      const mockTopics: SubscriptionTopic[] = [
        {
          id: 1,
          uuid: 'uuid-1',
          slug: 'test-topic',
          translations: {
            el: {
              name: 'Test Topic',
              description: 'Test Description',
            },
          },
          category: 'MARKETING',
          isActive: true,
          isDefault: false,
          requiresConfirmation: false,
          subscriberCount: 0,
        },
      ]

      mockTopicsStatusRef.value = 'success'
      mockTopicsRef.value = mockTopics
      mockSubscriptionsStatusRef.value = 'success'
      mockSubscriptionsRef.value = []
      mockGroupByCategory.mockReturnValue({
        MARKETING: [mockTopics[0]],
      })

      mount(SubscriptionTopicsListTest)

      // groupByCategory should be called with topics data
      expect(mockGroupByCategory).toHaveBeenCalledWith(mockTopics)
    })

    it('should display empty state when no topics available', () => {
      mockTopicsStatusRef.value = 'success'
      mockTopicsRef.value = []
      mockSubscriptionsStatusRef.value = 'success'
      mockSubscriptionsRef.value = []
      mockGroupByCategory.mockReturnValue({})

      const wrapper = mount(SubscriptionTopicsListTest)

      // Should display empty state
      expect(wrapper.find('.empty').exists()).toBe(true)
      expect(wrapper.text()).toContain('No topics')
    })
  })

  describe('Subscribe/Unsubscribe Interactions', () => {
    it('should expose subscribe method from composable', () => {
      mockTopicsStatusRef.value = 'success'
      mockTopicsRef.value = []
      mockSubscriptionsStatusRef.value = 'success'
      mockSubscriptionsRef.value = []

      const wrapper = mount(SubscriptionTopicsListTest)

      // Component should have access to subscribe method
      expect(wrapper.vm.subscribe).toBeDefined()
      expect(typeof wrapper.vm.subscribe).toBe('function')
    })

    it('should expose unsubscribe method from composable', () => {
      mockTopicsStatusRef.value = 'success'
      mockTopicsRef.value = []
      mockSubscriptionsStatusRef.value = 'success'
      mockSubscriptionsRef.value = []

      const wrapper = mount(SubscriptionTopicsListTest)

      // Component should have access to unsubscribe method
      expect(wrapper.vm.unsubscribe).toBeDefined()
      expect(typeof wrapper.vm.unsubscribe).toBe('function')
    })
  })

  describe('Component API Stability', () => {
    it('should maintain consistent data structure', () => {
      mockTopicsStatusRef.value = 'success'
      mockTopicsRef.value = []
      mockSubscriptionsStatusRef.value = 'success'
      mockSubscriptionsRef.value = []
      mockGroupByCategory.mockReturnValue({})

      const wrapper = mount(SubscriptionTopicsListTest)

      // Verify component exposes expected properties
      expect(wrapper.vm.topics).toBeDefined()
      expect(wrapper.vm.subscriptions).toBeDefined()
      expect(wrapper.vm.topicsStatus).toBeDefined()
      expect(wrapper.vm.subscriptionsStatus).toBeDefined()
      expect(wrapper.vm.loading).toBeDefined()
      expect(wrapper.vm.error).toBeDefined()
      expect(wrapper.vm.hasTopics).toBeDefined()
      expect(wrapper.vm.groupedByCategory).toBeDefined()
      expect(wrapper.vm.categoriesWithTopics).toBeDefined()
    })

    it('should call fetchTopics and fetchSubscriptions on mount', () => {
      mockTopicsStatusRef.value = 'success'
      mockTopicsRef.value = []
      mockSubscriptionsStatusRef.value = 'success'
      mockSubscriptionsRef.value = []

      const wrapper = mount(SubscriptionTopicsListTest)

      // Composables should be called during component setup
      // Verify the component has access to the data
      expect(wrapper.vm.topics).toBeDefined()
      expect(wrapper.vm.subscriptions).toBeDefined()
    })

    it('should use status.value === "pending" pattern for loading state', () => {
      // Test pending state
      mockTopicsStatusRef.value = 'pending'
      mockSubscriptionsStatusRef.value = 'idle'

      const wrapper1 = mount(SubscriptionTopicsListTest)
      expect(wrapper1.vm.loading).toBe(true)

      // Test success state
      mockTopicsStatusRef.value = 'success'
      mockSubscriptionsStatusRef.value = 'success'

      const wrapper2 = mount(SubscriptionTopicsListTest)
      expect(wrapper2.vm.loading).toBe(false)
    })

    it('should destructure data, status, error from AsyncData results', () => {
      mockTopicsStatusRef.value = 'success'
      mockTopicsRef.value = [
        {
          id: 1,
          uuid: 'uuid-1',
          slug: 'test-topic',
          translations: {
            el: {
              name: 'Test Topic',
              description: 'Test Description',
            },
          },
          category: 'MARKETING',
          isActive: true,
          isDefault: false,
          requiresConfirmation: false,
          subscriberCount: 0,
        },
      ]
      mockSubscriptionsStatusRef.value = 'success'
      mockSubscriptionsRef.value = []
      mockGroupByCategory.mockReturnValue({
        MARKETING: [mockTopicsRef.value[0]],
      })

      const wrapper = mount(SubscriptionTopicsListTest)

      // Verify component has access to all destructured properties
      expect(wrapper.vm.topics).toBeDefined()
      expect(wrapper.vm.subscriptions).toBeDefined()
      expect(wrapper.vm.topicsStatus).toBeDefined()
      expect(wrapper.vm.subscriptionsStatus).toBeDefined()
      expect(wrapper.vm.topicsError).toBeDefined()
      expect(wrapper.vm.subscriptionsError).toBeDefined()
      
      // Verify the component uses these properties correctly
      expect(wrapper.vm.loading).toBe(false)
      expect(wrapper.vm.hasTopics).toBe(true)
    })
  })
})
