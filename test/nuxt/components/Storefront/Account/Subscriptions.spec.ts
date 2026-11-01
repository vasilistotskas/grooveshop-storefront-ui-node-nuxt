import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import Subscriptions from '~/components/Storefront/Account/Subscriptions.vue'
import { makeEmailPreferences, makeSubscriptionTopic } from '~~/test/fixtures/subscription'

/** The page body: its heading and lead, the topics list, then the store emails. */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('useRequestApi', () => () => api)
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

describe('Storefront/Account/Subscriptions', () => {
  it('heads the page with the email-topics title and the always-sent lead, above the topics and the store emails', async () => {
    clearNuxtData(['subscription:topics:list', 'subscription:user:list', 'emails:preferences:el'])
    api.routes({
      '/api/subscriptions/topics': { count: 1, results: [makeSubscriptionTopic()] },
      '/api/subscriptions/user': { count: 0, results: [] },
      '/api/user/email-preferences': makeEmailPreferences(),
    })

    const wrapper = await mountSuspended(Subscriptions, { route: false })
    await flushPromises()

    expect(wrapper.find('h1').text()).toBe('Θέματα email')
    expect(wrapper.find('header p').text()).toContain('στέλνονται πάντα')
    const sections = wrapper.findAll('section')
    expect(sections[0]!.find('h3').text()).toBe('Θέμα 1')
    expect(sections.at(-1)!.find('h2').text()).toBe('Email του καταστήματος')
  })
})
