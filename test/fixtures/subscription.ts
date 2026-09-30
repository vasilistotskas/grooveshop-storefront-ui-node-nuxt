import type { SubscriptionTopic, UserSubscription } from '~~/shared/openapi/types.gen'
import { FIXTURE_TIMESTAMP, fixtureUuid } from './product'

/**
 * A `SubscriptionTopic` (one row of `/api/subscriptions/topics`) valid
 * against the generated `zSubscriptionTopic` (proved by
 * `test/unit/fixtures/subscription.spec.ts`).
 *
 * Defaults: topic 1, an active, optional `MARKETING` topic with no
 * subscribers and an `el` name. `uuid` and `slug` follow `id`.
 */
export function makeSubscriptionTopic(overrides: Partial<SubscriptionTopic> = {}): SubscriptionTopic {
  const id = overrides.id ?? 1

  return {
    translations: { el: { name: `Θέμα ${id}`, description: `Περιγραφή θέματος ${id}` } },
    id,
    uuid: fixtureUuid(20, id),
    slug: `topic-${id}`,
    category: 'MARKETING',
    isActive: true,
    isDefault: false,
    requiresConfirmation: false,
    subscriberCount: 0,
    ...overrides,
  }
}

/**
 * A `UserSubscription` (one row of `/api/subscriptions/user`) valid
 * against the generated `zUserSubscription`.
 *
 * Defaults: subscription 1 of user 1, active since `FIXTURE_TIMESTAMP`,
 * to `topicDetails` — `makeSubscriptionTopic({ id: topic })` unless
 * given — and `topic` follows that topic's id. An explicit override wins.
 */
export function makeUserSubscription(overrides: Partial<UserSubscription> = {}): UserSubscription {
  const topicDetails = overrides.topicDetails ?? makeSubscriptionTopic({ id: overrides.topic ?? 1 })

  return {
    id: 1,
    user: 1,
    topic: topicDetails.id,
    topicDetails,
    status: 'ACTIVE',
    subscribedAt: FIXTURE_TIMESTAMP,
    unsubscribedAt: null,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    ...overrides,
  }
}
