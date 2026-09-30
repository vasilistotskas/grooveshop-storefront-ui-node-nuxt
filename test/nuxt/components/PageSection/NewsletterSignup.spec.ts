import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import NewsletterSignup from '~/components/PageSection/NewsletterSignup.vue'
import { newsletterConsent, newsletterConsentText } from '~~/shared/i18n/newsletterConsent'
import { failWith } from '~~/test/helpers/api'

/**
 * The newsletter band. What matters:
 *
 * - it appears only when the store can honour a submission — the
 *   merchant toggle on AND a default newsletter topic to land in;
 * - consent is an unticked box the visitor must tick, labelled with
 *   the sentence from `shared/i18n/newsletterConsent.ts` (the module
 *   the server route stores as proof, so they cannot drift);
 * - the locale the label was rendered in travels in `$api`'s page-locale
 *   header (`pageLocaleHeader`, tested separately), not in the request;
 * - its four states: idle, submitting, sent, error (429 → "later").
 */
const flags = vi.hoisted(() => ({ newsletterEnabled: true, available: true }))

mockNuxtImport('useSettingFlag', () => (key: string, options: { fallback: boolean }) =>
  computed(() => (key === 'NEWSLETTER_ENABLED' ? flags.newsletterEnabled : options.fallback)),
)

/** The availability lookup; a `vi.fn` so the request gate can be asserted. */
const { useApiMock } = vi.hoisted(() => ({
  useApiMock: vi.fn((_url: string, _options: { immediate?: boolean, server?: boolean }) =>
    Promise.resolve({ data: ref({ available: flags.available }) })),
}))
mockNuxtImport('useApi', () => useApiMock)

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const NEWSLETTER_URL = '/api/subscriptions/newsletter'

/** The component's own `<i18n>` copy (el), which the global `$i18n` cannot reach. */
const COPY = { failed: 'Η εγγραφή δεν ολοκληρώθηκε. Δοκίμασε ξανά.' }

const mountBand = (props: Record<string, unknown> = {}) =>
  mountSuspended(NewsletterSignup, { route: false, props })

/** UForm validates asynchronously; `flushPromises` drains it and the mocked request. */
async function fillAndSubmit(
  wrapper: Awaited<ReturnType<typeof mountBand>>,
  { tick = true } = {},
) {
  await wrapper.find('input[type="email"]').setValue('visitor@example.com')
  if (tick) await wrapper.find('[role="checkbox"]').trigger('click')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

const postCalls = () => api.callsTo(NEWSLETTER_URL)

describe('NewsletterSignup', () => {
  beforeEach(() => {
    flags.newsletterEnabled = true
    flags.available = true
  })

  it('renders the form with an UNTICKED consent box labelled by the shared sentence', async () => {
    const wrapper = await mountBand()

    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    const checkbox = wrapper.find('[role="checkbox"]')
    expect(checkbox.attributes('aria-checked')).toBe('false')
    expect(wrapper.find('form').text()).toContain(newsletterConsentText('el'))
    // The privacy policy is a link inside the sentence.
    const link = wrapper.find('form a[href*="privacy-policy"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe(newsletterConsent('el').privacy)
    // The old signed-out fallback is gone.
    expect(wrapper.find('a[href*="/account/signup"]').exists()).toBe(false)
  })

  /**
   * The label IS the consent Django stores as proof, so it must be
   * exactly the shared sentence's three parts, in order — the privacy
   * policy as the link between them — and nothing else.
   */
  it('labels the consent box with exactly the shared sentence, privacy policy linked', async () => {
    const wrapper = await mountBand()
    const { before, privacy, after } = newsletterConsent('el')

    const link = wrapper.find('form a[href*="privacy-policy"]')
    const label = link.element.parentElement!
    // Vue's fragment anchors are empty text and comment nodes; skip them.
    const parts = [...label.childNodes]
      .filter(node => node.nodeType !== Node.COMMENT_NODE && node.textContent !== '')
      .map(node => node.textContent)
    expect(parts).toEqual([before, privacy, after])
    expect(label.textContent).toBe(newsletterConsentText('el'))
  })

  it('uses the operator placeholder and button text', async () => {
    const wrapper = await mountBand({ placeholder: 'you@shop', buttonText: 'Join us' })

    expect(wrapper.find('input[type="email"]').attributes('placeholder')).toBe('you@shop')
    expect(wrapper.find('button[type="submit"]').text()).toContain('Join us')
  })

  it('renders nothing when the store has no default newsletter topic', async () => {
    flags.available = false
    const wrapper = await mountBand()

    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('renders nothing, and never asks, when NEWSLETTER_ENABLED is off', async () => {
    flags.newsletterEnabled = false
    const wrapper = await mountBand()

    expect(wrapper.find('form').exists()).toBe(false)
    // Django 404s the lookup while the toggle is off: the REQUEST is gated.
    expect(useApiMock.mock.calls.map(([url, options]) => [url, options.immediate, options.server]))
      .toEqual([[NEWSLETTER_URL, false, false]])
  })

  it('refuses to submit without consent', async () => {
    const wrapper = await mountBand()

    await fillAndSubmit(wrapper, { tick: false })

    expect(postCalls()).toHaveLength(0)
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('posts email + consent through $api, then shows "check your inbox"', async () => {
    const wrapper = await mountBand()

    await fillAndSubmit(wrapper)

    const calls = postCalls()
    expect(calls).toHaveLength(1)
    const opts = calls[0]!.options as { method: string, query?: unknown, body: Record<string, unknown> }
    expect(opts.method).toBe('POST')
    // The locale travels in `$api`'s page-locale header, not the query.
    expect(opts).not.toHaveProperty('query')
    expect(opts.body).toEqual({ email: 'visitor@example.com', consent: true })
    // The browser never supplies the consent sentence: the server does.
    expect(opts.body).not.toHaveProperty('consentText')

    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
  })

  it('on /en shows the English sentence and sends no locale query', async () => {
    const { $i18n } = useNuxtApp()
    $i18n.locale.value = 'en'
    try {
      const wrapper = await mountBand()

      expect(wrapper.find('form').text()).toContain(newsletterConsentText('en'))
      await fillAndSubmit(wrapper)

      const opts = postCalls()[0]!.options as { query?: unknown }
      expect(opts).not.toHaveProperty('query')
    }
    finally {
      $i18n.locale.value = 'el'
    }
  })

  it('disables the button while the request is in flight, and sends it once', async () => {
    let resolve!: (value: object) => void
    api.routes({
      [NEWSLETTER_URL]: () => new Promise<object>((r) => {
        resolve = r
      }),
    })
    const wrapper = await mountBand()

    await fillAndSubmit(wrapper)
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    resolve({ detail: 'ok' })
    await flushPromises()
    expect(postCalls()).toHaveLength(1)
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
  })

  it('tells a throttled visitor to try again later', async () => {
    api.routes({ [NEWSLETTER_URL]: failWith(429, { detail: 'Request was throttled.' }) })
    const wrapper = await mountBand()

    await fillAndSubmit(wrapper)

    const alert = wrapper.find('[role="alert"]')
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toBe(useNuxtApp().$i18n.t('error.rate_limited'))
    // Still the form: the visitor can try again.
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('shows a field rejection inline', async () => {
    api.routes({ [NEWSLETTER_URL]: failWith(400, { email: ['Enter a valid email address.'] }) })
    const wrapper = await mountBand()

    await fillAndSubmit(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toContain('Enter a valid email address.')
  })

  it('says a plain failure failed, and keeps the form for a retry', async () => {
    api.routes({ [NEWSLETTER_URL]: failWith(502, 'Bad Gateway') })
    const wrapper = await mountBand()

    await fillAndSubmit(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toBe(COPY.failed)
    expect(wrapper.find('form').exists()).toBe(true)
  })
})
