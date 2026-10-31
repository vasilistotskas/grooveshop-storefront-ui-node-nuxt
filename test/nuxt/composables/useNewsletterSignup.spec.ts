import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { failWith } from '~~/test/helpers/api'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * `useNewsletterSignup` turns what Django answered an accepted request with
 * into one `outcome` a form draws a state for: `pending_confirmation` (check
 * the inbox) or `already_subscribed` (the signed-in account is subscribed).
 * A failed request has no outcome, only a `failure`.
 */
mockNuxtImport('useApi', () => () => Promise.resolve({ data: ref({ available: true }) }))

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const NEWSLETTER_URL = '/api/subscriptions/newsletter'
const BODY = { email: 'visitor@example.com', consent: true }

async function setup() {
  let signup!: Awaited<ReturnType<typeof useNewsletterSignup>>
  await mountSuspended(defineComponent({
    async setup() {
      signup = await useNewsletterSignup({ consentRequired: () => 'tick the box' })
      return () => null
    },
  }), { route: false })
  return signup
}

describe('useNewsletterSignup', () => {
  beforeEach(() => {
    setTenant()
    setTenantFeatures({ newsletter: true })
  })

  it('has no outcome before a request', async () => {
    const signup = await setup()

    expect(signup.outcome.value).toBeNull()
    expect(signup.failure.value).toBeNull()
  })

  it('ends as pending_confirmation when Django asks for a confirmation', async () => {
    api.routes({ [NEWSLETTER_URL]: { detail: 'Thank you.', status: 'pending_confirmation' } })
    const signup = await setup()

    await signup.subscribe(BODY)
    await flushPromises()

    expect(signup.outcome.value).toBe('pending_confirmation')
    expect(signup.failure.value).toBeNull()
    expect(signup.submitting.value).toBe(false)
  })

  it('ends as already_subscribed when the signed-in account already is', async () => {
    api.routes({ [NEWSLETTER_URL]: { detail: 'You are already subscribed.', status: 'already_subscribed' } })
    const signup = await setup()

    await signup.subscribe(BODY)
    await flushPromises()

    expect(signup.outcome.value).toBe('already_subscribed')
    expect(signup.failure.value).toBeNull()
  })

  it('has a failure and no outcome when the request fails', async () => {
    api.routes({ [NEWSLETTER_URL]: failWith(429, { detail: 'Request was throttled.' }) })
    const signup = await setup()

    await signup.subscribe(BODY)
    await flushPromises()

    expect(signup.outcome.value).toBeNull()
    expect(signup.failure.value).toEqual({ kind: 'rate_limited' })
  })

  it('clears the failure when a retry is accepted', async () => {
    api.routes({ [NEWSLETTER_URL]: failWith(502, 'Bad Gateway') })
    const signup = await setup()
    await signup.subscribe(BODY)
    expect(signup.failure.value).toEqual({ kind: 'failed' })

    api.routes({ [NEWSLETTER_URL]: { detail: 'Thank you.', status: 'pending_confirmation' } })
    await signup.subscribe(BODY)

    expect(signup.failure.value).toBeNull()
    expect(signup.outcome.value).toBe('pending_confirmation')
  })
})
