import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import Subscriptions from '~/components/Storefront/Account/Subscriptions.vue'
import { makeSubscriptionTopic } from '~~/test/fixtures/subscription'

/** The page body: its heading and lead, around the topics list. */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('useRequestApi', () => () => api)

describe('Storefront/Account/Subscriptions', () => {
  it('heads the page with the email-topics title and the always-sent lead, above the topics', async () => {
    clearNuxtData(['subscription:topics:list', 'subscription:user:list'])
    api.routes({
      '/api/subscriptions/topics': { count: 1, results: [makeSubscriptionTopic()] },
      '/api/subscriptions/user': { count: 0, results: [] },
    })

    const wrapper = await mountSuspended(Subscriptions, { route: false })
    await flushPromises()

    expect(wrapper.find('h1').text()).toBe('Θέματα email')
    expect(wrapper.find('header p').text()).toContain('στέλνονται πάντα')
    expect(wrapper.find('section h3').text()).toBe('Θέμα 1')
  })
})
