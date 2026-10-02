import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import ChromeFooterNewsletter from '~/components/Chrome/FooterNewsletter.vue'
import { newsletterConsentText } from '~~/shared/i18n/newsletterConsent'

/**
 * The footer's newsletter card shares the band's signup
 * (`useNewsletterSignup`, covered in full by `NewsletterSignup.spec.ts`).
 * Here: it appears only when the store can honour a submission, keeps
 * the unticked consent box the law needs, and sends a ticked form.
 */
const flags = vi.hoisted(() => ({ available: true }))

mockNuxtImport('useSettingFlag', () => (_key: string, options: { fallback: boolean }) =>
  computed(() => options.fallback))
mockNuxtImport('useApi', () => () => Promise.resolve({ data: ref({ available: flags.available }) }))

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const NEWSLETTER_URL = '/api/subscriptions/newsletter'

const mountCard = () => mountSuspended(ChromeFooterNewsletter, { route: false })

describe('Chrome/FooterNewsletter', () => {
  beforeEach(() => {
    flags.available = true
  })

  it('renders nothing when the store cannot take a subscription', async () => {
    flags.available = false

    const wrapper = await mountCard()

    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('asks for consent with the shared sentence, unticked', async () => {
    const wrapper = await mountCard()

    expect(wrapper.find('[role="checkbox"]').attributes('aria-checked')).toBe('false')
    expect(wrapper.find('form').text()).toContain(newsletterConsentText('el'))
  })

  it('subscribes a ticked form, then says to check the inbox', async () => {
    const wrapper = await mountCard()

    await wrapper.find('input[type="email"]').setValue('visitor@example.com')
    await wrapper.find('[role="checkbox"]').trigger('click')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(api.callsTo(NEWSLETTER_URL).map(call => call.options?.body))
      .toEqual([{ email: 'visitor@example.com', consent: true }])
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
  })

  it('sends nothing without consent', async () => {
    const wrapper = await mountCard()

    await wrapper.find('input[type="email"]').setValue('visitor@example.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(api.callsTo(NEWSLETTER_URL)).toHaveLength(0)
  })
})
