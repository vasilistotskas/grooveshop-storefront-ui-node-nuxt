/**
 * Test data helpers for subscription-related tests
 * 
 * Provides factory functions to create properly typed test data
 * that matches the auto-generated OpenAPI types.
 */
import type { SubscriptionTopic, UserSubscription, CategoryEnum, SubscriptionStatus } from '#shared/openapi/types.gen'

/**
 * Create a mock SubscriptionTopic with proper structure
 */
export function createMockTopic(overrides: Partial<SubscriptionTopic> = {}): SubscriptionTopic {
  return {
    id: 1,
    uuid: 'test-uuid',
    slug: 'test-topic',
    translations: {
      el: {
        name: 'Test Topic',
        description: 'Test Description',
      },
    },
    category: 'MARKETING' as CategoryEnum,
    isActive: true,
    isDefault: false,
    requiresConfirmation: false,
    subscriberCount: 0,
    ...overrides,
  }
}

/**
 * Create a mock UserSubscription with proper structure
 */
export function createMockSubscription(overrides: Partial<UserSubscription> = {}): UserSubscription {
  return {
    id: 1,
    user: 1,
    topic: 1,
    topicDetails: createMockTopic(),
    status: 'ACTIVE' as SubscriptionStatus,
    subscribedAt: new Date().toISOString(),
    unsubscribedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}
