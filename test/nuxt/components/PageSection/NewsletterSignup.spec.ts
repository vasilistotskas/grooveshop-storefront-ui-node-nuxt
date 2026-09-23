import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import NewsletterSignup from '~/components/PageSection/NewsletterSignup.vue'
import { newsletterConsent, newsletterConsentText } from '~~/shared/i18n/newsletterConsent'

/**
 * The newsletter band. What matters:
 *
 * - it appears only when the store can honour a submission — the
 *   merchant toggle on AND a default newsletter topic to land in;
 * - consent is an unticked box the visitor must tick, labelled with
 *   the sentence from `shared/i18n/newsletterConsent.ts` (the module
 *   the server route stores as proof, so they cannot drift);
 * - the request names the locale the label was rendered in;
 * - its four states: idle, submitting, sent, error (429 → "later").
 */
const flags = vi.hoisted(() => ({ newsletterEnabled: true, available: true }))

mockNuxtImport('useSettingFlag', () => (key: string, options: { fallback: boolean }) =>
  computed(() => (key === 'NEWSLETTER_ENABLED' ? flags.newsletterEnabled : options.fallback)),
)

mockNuxtImport('useFetch', () => () =>
  Promise.resolve({ data: ref({ available: flags.available }) }),
)

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn((_url: unknown, _opts?: unknown) => Promise.resolve({})),
}))
mockNuxtImport('$fetch', () => mockFetch)

async function fillAndSubmit(
  wrapper: Awaited<ReturnType<typeof mountSuspended>>,
  { tick = true } = {},
) {
  await wrapper.find('input[type="email"]').setValue('visitor@example.com')
  if (tick) await wrapper.find('[role="checkbox"]').trigger('click')
  await wrapper.find('form').trigger('submit')
  await new Promise(resolve => setTimeout(resolve, 50))
}

function postCalls() {
  return mockFetch.mock.calls.filter(
    ([url]) => String(url) === '/api/subscriptions/newsletter',
  )
}

describe('NewsletterSignup', () => {
  beforeEach(() => {
    flags.newsletterEnabled = true
    flags.available = true
    mockFetch.mockReset()
    mockFetch.mockImplementation(() => Promise.resolve({}))
  })

  it('renders the form with an UNTICKED consent box labelled by the shared sentence', async () => {
    const wrapper = await mountSuspended(NewsletterSignup, { props: {} })

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

  it('uses the operator placeholder and button text', async () => {
    const wrapper = await mountSuspended(NewsletterSignup, {
      props: { placeholder: 'you@shop', buttonText: 'Join us' },
    })

    expect(wrapper.find('input[type="email"]').attributes('placeholder')).toBe('you@shop')
    expect(wrapper.find('button[type="submit"]').text()).toContain('Join us')
  })

  it('renders nothing when the store has no default newsletter topic', async () => {
    flags.available = false
    const wrapper = await mountSuspended(NewsletterSignup, { props: {} })

    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('renders nothing when NEWSLETTER_ENABLED is off', async () => {
    flags.newsletterEnabled = false
    const wrapper = await mountSuspended(NewsletterSignup, { props: {} })

    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('refuses to submit without consent', async () => {
    const wrapper = await mountSuspended(NewsletterSignup, { props: {} })

    await fillAndSubmit(wrapper, { tick: false })

    expect(postCalls()).toHaveLength(0)
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('posts email + consent with the rendered locale, then shows "check your inbox"', async () => {
    const wrapper = await mountSuspended(NewsletterSignup, { props: {} })

    await fillAndSubmit(wrapper)

    const calls = postCalls()
    expect(calls).toHaveLength(1)
    const opts = calls[0]![1] as { method: string, query: Record<string, string>, body: Record<string, unknown> }
    expect(opts.method).toBe('POST')
    expect(opts.query).toEqual({ locale: 'el' })
    expect(opts.body).toEqual({ email: 'visitor@example.com', consent: true })
    // The browser never supplies the consent sentence: the server does.
    expect(opts.body).not.toHaveProperty('consentText')

    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
  })

  it('on /en shows the English sentence and asks the server for English', async () => {
    const { $i18n } = useNuxtApp()
    $i18n.locale.value = 'en'
    try {
      const wrapper = await mountSuspended(NewsletterSignup, { props: {} })

      expect(wrapper.find('form').text()).toContain(newsletterConsentText('en'))
      await fillAndSubmit(wrapper)

      const opts = postCalls()[0]![1] as { query: Record<string, string> }
      expect(opts.query).toEqual({ locale: 'en' })
    }
    finally {
      $i18n.locale.value = 'el'
    }
  })

  it('shows the button loading while the request is in flight', async () => {
    let resolve!: (value: object) => void
    mockFetch.mockImplementation(() => new Promise<object>((r) => {
      resolve = r
    }))
    const wrapper = await mountSuspended(NewsletterSignup, { props: {} })

    await fillAndSubmit(wrapper)

    const button = wrapper.find('button[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()
    resolve({ detail: 'ok' })
    await new Promise(r => setTimeout(r, 20))
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
  })

  it('tells a throttled visitor to try again later', async () => {
    mockFetch.mockImplementation(() =>
      Promise.reject(Object.assign(new Error('Too Many Requests'), {
        statusCode: 429,
        data: { detail: 'Request was throttled.' },
      })),
    )
    const wrapper = await mountSuspended(NewsletterSignup, { props: {} })

    await fillAndSubmit(wrapper)

    const alert = wrapper.find('[role="alert"]')
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toBe(useNuxtApp().$i18n.t('error.rate_limited'))
    // Still the form: the visitor can try again.
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('shows a field rejection inline', async () => {
    mockFetch.mockImplementation(() =>
      Promise.reject(Object.assign(new Error('Bad Request'), {
        statusCode: 400,
        data: { email: ['Enter a valid email address.'] },
      })),
    )
    const wrapper = await mountSuspended(NewsletterSignup, { props: {} })

    await fillAndSubmit(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toContain('Enter a valid email address.')
  })
})
