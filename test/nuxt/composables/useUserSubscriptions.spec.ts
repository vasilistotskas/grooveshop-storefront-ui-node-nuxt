import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData, useNuxtApp } from '#imports'
import { useUserSubscriptions } from '~/composables/useUserSubscriptions'
import { makeUserSubscription } from '~~/test/fixtures/subscription'

/**
 * `fetchSubscriptions` runs the REAL `useAsyncData` over a mocked
 * `useRequestApi`. The mutations are checked for the request they make,
 * the two list caches they refresh afterwards (and only on success), and
 * the toast they show. `$i18n` is the app's real instance, so toast copy
 * is compared against `$i18n.t(key)`.
 */

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
const { mockRefreshNuxtData, mockToast } = vi.hoisted(() => ({
  mockRefreshNuxtData: vi.fn(() => Promise.resolve()),
  mockToast: { add: vi.fn() },
}))

mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('useRequestApi', () => () => api)
mockNuxtImport('refreshNuxtData', () => mockRefreshNuxtData)
mockNuxtImport('useToast', () => () => mockToast)

const t = (key: string) => useNuxtApp().$i18n.t(key)

const toast = (prefix: string, color: 'success' | 'error', kind: 'success' | 'error' = color) => ({
  title: t(`subscription_notifications.${prefix}.${kind}_title`),
  description: t(`subscription_notifications.${prefix}.${kind}_description`),
  color,
})

describe('useUserSubscriptions', () => {
  beforeEach(() => {
    clearNuxtData()
  })

  describe('fetchSubscriptions', () => {
    it('GETs the subscriptions and hands back the page results', async () => {
      const subscriptions = [makeUserSubscription({ id: 1 }), makeUserSubscription({ id: 2, topic: 2 })]
      api.routes({ '/api/subscriptions/user': { count: 2, next: null, previous: null, results: subscriptions } })

      const { data } = await useUserSubscriptions().fetchSubscriptions()

      expect(api.callsTo('/api/subscriptions/user')).toEqual([
        { url: '/api/subscriptions/user', options: { method: 'GET' } },
      ])
      expect(data.value).toEqual(subscriptions)
    })

    it('hands back an empty list for an answer without results', async () => {
      api.routes({ '/api/subscriptions/user': {} })

      const { data } = await useUserSubscriptions().fetchSubscriptions()

      expect(data.value).toEqual([])
    })
  })

  describe.each([
    {
      name: 'subscribe',
      run: () => useUserSubscriptions().subscribe(7),
      url: '/api/subscriptions/topics/7/subscribe',
      options: { method: 'POST' },
      success: () => toast('subscribe', 'success'),
      failure: () => toast('subscribe', 'error'),
      answer: makeUserSubscription({ topic: 7 }),
    },
    {
      name: 'unsubscribe',
      run: () => useUserSubscriptions().unsubscribe(3),
      url: '/api/subscriptions/user/3',
      options: { method: 'DELETE' },
      success: () => toast('unsubscribe', 'success'),
      failure: () => toast('unsubscribe', 'error'),
      answer: undefined,
    },
  ])('$name', ({ run, url, options, success, failure, answer }) => {
    it('sends the request, refreshes the user list then the topics list, and confirms', async () => {
      api.routes({ [url]: answer })

      await expect(run()).resolves.toEqual(answer)

      expect(api.callsTo(url)).toEqual([{ url, options }])
      expect(mockRefreshNuxtData.mock.calls).toEqual([['subscription:user:list'], ['subscription:topics:list']])
      expect(mockToast.add).toHaveBeenCalledExactlyOnceWith(success())
    })

    it('rethrows a failure after an error toast, re-reading only the user list', async () => {
      const rejection = new Error('API error')
      api.routes({
        [url]: () => {
          throw rejection
        },
      })

      await expect(run()).rejects.toBe(rejection)

      // A refusal is usually stale state: the switch must show what is true.
      expect(mockRefreshNuxtData.mock.calls).toEqual([['subscription:user:list']])
      expect(mockToast.add).toHaveBeenCalledExactlyOnceWith(failure())
    })
  })

  describe('subscribe to a topic that asks for confirmation', () => {
    it('tells the shopper to confirm by email rather than that they are subscribed', async () => {
      api.routes({ '/api/subscriptions/topics/7/subscribe': makeUserSubscription({ topic: 7, status: 'PENDING' }) })

      await useUserSubscriptions().subscribe(7)

      expect(mockToast.add).toHaveBeenCalledExactlyOnceWith(toast('subscribe', 'success', 'pending' as never))
    })
  })

  describe('isSubscribed', () => {
    const subscriptions = [
      makeUserSubscription({ id: 1, topic: 1, status: 'ACTIVE' }),
      makeUserSubscription({ id: 2, topic: 2, status: 'UNSUBSCRIBED' }),
      makeUserSubscription({ id: 3, topic: 3, status: 'PENDING' }),
      makeUserSubscription({ id: 4, topic: 4, status: 'BOUNCED' }),
    ]

    it.each([
      ['an active subscription', subscriptions, 1, true],
      ['a subscription unsubscribed by email', subscriptions, 2, false],
      ['a subscription pending its confirmation', subscriptions, 3, true],
      ['a bounced subscription', subscriptions, 4, false],
      ['a topic not subscribed', subscriptions, 999, false],
      ['no subscriptions', [], 1, false],
      ['null subscriptions', null, 1, false],
    ])('is %s → %s', (_label, list, topicId, expected) => {
      expect(useUserSubscriptions().isSubscribed(list, topicId)).toBe(expected)
    })
  })

  describe('getSubscriptionByTopicId', () => {
    const subscriptions = [
      makeUserSubscription({ id: 1, topic: 1 }),
      makeUserSubscription({ id: 2, topic: 2, status: 'UNSUBSCRIBED' }),
    ]

    it('finds the subscription for the topic, whatever its status', () => {
      expect(useUserSubscriptions().getSubscriptionByTopicId(subscriptions, 2)).toBe(subscriptions[1])
    })

    it.each([
      ['an unknown topic', subscriptions, 999],
      ['no subscriptions', [], 1],
      ['null subscriptions', null, 1],
    ])('is undefined for %s', (_label, list, topicId) => {
      expect(useUserSubscriptions().getSubscriptionByTopicId(list, topicId)).toBeUndefined()
    })
  })
})
