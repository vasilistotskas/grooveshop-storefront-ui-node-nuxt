import { describe, expect, it } from 'vitest'

import { zSubscriptionTopic, zUserSubscription } from '~~/shared/openapi/zod.gen'
import { makeSubscriptionTopic, makeUserSubscription } from '~~/test/fixtures/subscription'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/**
 * `makeSubscriptionTopic` / `makeUserSubscription` replace the old
 * `test/helpers/subscriptionTestData.ts`, whose topic carried the uuid
 * `'test-uuid'` and whose timestamps were `new Date()` — a payload
 * Django cannot send, dated whenever the suite ran. Parsed strictly, so
 * a stale key fails here and names itself.
 */
describe('subscription fixtures', () => {
  it.each([
    ['makeSubscriptionTopic', zSubscriptionTopic, makeSubscriptionTopic()],
    ['makeSubscriptionTopic without a category', zSubscriptionTopic, makeSubscriptionTopic({ id: 2, category: undefined })],
    ['makeUserSubscription', zUserSubscription, makeUserSubscription()],
    ['makeUserSubscription, unsubscribed', zUserSubscription, makeUserSubscription({ id: 2, status: 'UNSUBSCRIBED', unsubscribedAt: '2026-01-02T00:00:00Z' })],
  ] as const)('%s parses strictly', (_name, schema, value) => {
    expect(problems(schema, value)).toEqual([])
  })

  it('gives two topics distinct uuids and slugs', () => {
    const [one, two] = [makeSubscriptionTopic(), makeSubscriptionTopic({ id: 2 })]

    expect(two.uuid).not.toBe(one.uuid)
    expect(two.slug).not.toBe(one.slug)
  })

  it('points a subscription at its topic, whichever side names it', () => {
    expect(makeUserSubscription({ topic: 7 })).toMatchObject({ topic: 7, topicDetails: { id: 7 } })
    expect(makeUserSubscription({ topicDetails: makeSubscriptionTopic({ id: 3 }) })).toMatchObject({ topic: 3 })
  })
})
