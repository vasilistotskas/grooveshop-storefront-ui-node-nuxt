import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import FooterNewsletter from '~/components/variants/webside/Footer/Newsletter.vue'
import { newsletterConsentText } from '~~/shared/i18n/newsletterConsent'
import { failWith } from '~~/test/helpers/api'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * Webside's footer newsletter is the same signup as the default footer's
 * card (`useNewsletterSignup`, covered in full by `NewsletterSignup.spec.ts`)
 * in webside's palette: it appears only when the store can honour a
 * submission, keeps the unticked consent box with the platform sentence, and
 * sends a ticked form.
 */
const flags = vi.hoisted(() => ({ available: true }))

mockNuxtImport('useApi', () => () => Promise.resolve({ data: ref({ available: flags.available }) }))

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const NEWSLETTER_URL = '/api/subscriptions/newsletter'

/** The component's own `<i18n>` copy (el), which the global `$i18n` cannot reach. */
const COPY = {
  sent: 'Έλεγξε τα εισερχόμενά σου',
  sentDescription: 'Σου στείλαμε ένα email για την εγγραφή σου.',
  alreadyTitle: 'Είσαι ήδη εγγεγραμμένος',
  alreadyManage: 'Διαχείριση εγγραφών',
}

/** What Django answers an accepted request with, per outcome. */
const PENDING = { detail: 'Thank you.', status: 'pending_confirmation' }
const ALREADY = { detail: 'You are already subscribed to the newsletter.', status: 'already_subscribed' }

const mountCard = () => mountSuspended(FooterNewsletter, { route: false })

async function tickAndSubmit(wrapper: Awaited<ReturnType<typeof mountCard>>) {
  await wrapper.find('input[type="email"]').setValue('visitor@example.com')
  await wrapper.find('[role="checkbox"]').trigger('click')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('webside Footer/Newsletter', () => {
  beforeEach(() => {
    flags.available = true
    setTenant()
  })

  it('renders nothing when the newsletter feature is off', async () => {
    setTenantFeatures({ newsletter: false })

    const wrapper = await mountCard()

    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('renders nothing when the store cannot take a subscription', async () => {
    flags.available = false

    const wrapper = await mountCard()

    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('asks for consent with the platform sentence, unticked', async () => {
    const wrapper = await mountCard()

    expect(wrapper.find('[role="checkbox"]').attributes('aria-checked')).toBe('false')
    expect(wrapper.find('form').text()).toContain(newsletterConsentText('el'))
  })

  it('names the email field by what it takes, and describes it with the pitch', async () => {
    const wrapper = await mountCard()

    const input = wrapper.find('input[type="email"]')
    expect(wrapper.find(`label[for="${input.attributes('id')}"]`).text()).toBe('Διεύθυνση email')
    expect(wrapper.find(`#${input.attributes('aria-describedby')}`).exists()).toBe(true)
  })

  it('subscribes a ticked form, then says to check the inbox', async () => {
    api.routes({ [NEWSLETTER_URL]: PENDING })
    const wrapper = await mountCard()

    await tickAndSubmit(wrapper)

    expect(api.callsTo(NEWSLETTER_URL).map(call => call.options?.body))
      .toEqual([{ email: 'visitor@example.com', consent: true }])
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('[role="status"]').text()).toContain(COPY.sent)
    expect(wrapper.find('[role="status"]').text()).toContain(COPY.sentDescription)
    expect(wrapper.find('a[href*="subscriptions"]').exists()).toBe(false)
  })

  it('tells a signed-in subscriber the account is already subscribed, with a link to manage it', async () => {
    api.routes({ [NEWSLETTER_URL]: ALREADY })
    const wrapper = await mountCard()

    await tickAndSubmit(wrapper)

    expect(wrapper.find('form').exists()).toBe(false)
    const status = wrapper.find('[role="status"]')
    expect(status.text()).toContain(COPY.alreadyTitle)
    expect(status.text()).not.toContain(COPY.sent)
    expect(status.find('a[href*="subscriptions"]').text()).toBe(COPY.alreadyManage)
  })

  it('keeps the form and shows no status when the request fails', async () => {
    api.routes({ [NEWSLETTER_URL]: failWith(502, 'Bad Gateway') })
    const wrapper = await mountCard()

    await tickAndSubmit(wrapper)

    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  })

  it('sends nothing without consent', async () => {
    const wrapper = await mountCard()

    await wrapper.find('input[type="email"]').setValue('visitor@example.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(api.callsTo(NEWSLETTER_URL)).toHaveLength(0)
  })

  it('tells a throttled visitor to wait', async () => {
    api.routes({ [NEWSLETTER_URL]: failWith(429, { detail: 'Request was throttled.' }) })
    const wrapper = await mountCard()

    await wrapper.find('input[type="email"]').setValue('visitor@example.com')
    await wrapper.find('[role="checkbox"]').trigger('click')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toBe(useNuxtApp().$i18n.t('error.rate_limited'))
  })
})
