import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useSubscriptionTopics } from '~/composables/useSubscriptionTopics'
import { createMockTopic } from '~~/test/helpers/subscriptionTestData'

/**
 * `fetchTopics` runs the REAL `useAsyncData` over a mocked
 * `useRequestApi` (it must forward the host and cookie during SSR), so
 * the handler's unwrapping of the paginated answer is what is tested.
 */

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('useRequestApi', () => () => api)

describe('useSubscriptionTopics', () => {
  beforeEach(() => {
    clearNuxtData()
  })

  describe('fetchTopics', () => {
    it('GETs the topics and hands back the page results', async () => {
      const topics = [createMockTopic({ id: 1 }), createMockTopic({ id: 2 })]
      api.routes({ '/api/subscriptions/topics': { count: 2, next: null, previous: null, results: topics } })

      const { data, error } = await useSubscriptionTopics().fetchTopics()

      expect(api.callsTo('/api/subscriptions/topics')).toEqual([
        { url: '/api/subscriptions/topics', options: { method: 'GET' } },
      ])
      expect(error.value).toBeUndefined()
      expect(data.value).toEqual(topics)
    })

    it.each([
      ['an answer without results', {}],
      ['an empty answer', null],
    ])('hands back an empty list for %s', async (_label, answer) => {
      api.routes({ '/api/subscriptions/topics': answer })

      const { data } = await useSubscriptionTopics().fetchTopics()

      expect(data.value).toEqual([])
    })

    it('surfaces a failed request as the error', async () => {
      api.routes({ '/api/subscriptions/topics': () => { throw new Error('Network error') } })

      const { data, error } = await useSubscriptionTopics().fetchTopics()

      expect(error.value?.message).toBe('Network error')
      expect(data.value).toBeUndefined()
    })
  })

  describe('getTopicById', () => {
    const topics = [createMockTopic({ id: 1 }), createMockTopic({ id: 2 })]

    it('finds the topic with that id', () => {
      expect(useSubscriptionTopics().getTopicById(topics, 2)).toBe(topics[1])
    })

    it.each([
      ['an unknown id', topics, 999],
      ['no topics', [], 1],
      ['null topics', null, 1],
    ])('is undefined for %s', (_label, list, id) => {
      expect(useSubscriptionTopics().getTopicById(list, id)).toBeUndefined()
    })
  })

  describe('groupByCategory', () => {
    it('groups by category, putting uncategorised topics under OTHER', () => {
      const topics = [
        createMockTopic({ id: 1, category: 'NEWSLETTER' }),
        createMockTopic({ id: 2, category: undefined }),
        createMockTopic({ id: 3, category: 'NEWSLETTER' }),
        createMockTopic({ id: 4, category: 'PROMOTIONAL' }),
      ]

      expect(useSubscriptionTopics().groupByCategory(topics)).toEqual({
        NEWSLETTER: [topics[0], topics[2]],
        OTHER: [topics[1]],
        PROMOTIONAL: [topics[3]],
      })
    })

    it.each([[null], [undefined], [[]]])('is empty for %j', (topics) => {
      expect(useSubscriptionTopics().groupByCategory(topics)).toEqual({})
    })
  })
})
