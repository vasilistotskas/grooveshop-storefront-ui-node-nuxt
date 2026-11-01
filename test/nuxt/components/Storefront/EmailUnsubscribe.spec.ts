import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Component } from 'vue'
import EmailUnsubscribe from '~/components/Storefront/EmailUnsubscribe.vue'
import WebsideEmailUnsubscribe from '~/components/variants/webside/Storefront/EmailUnsubscribe.vue'
import { failWith } from '~~/test/helpers/api'
import { inlineCopy } from '~~/test/helpers/inlineCopy'
import { trees } from '~~/test/helpers/trees'

/**
 * The page a marketing email's unsubscribe link opens. Opening it must
 * unsubscribe NOBODY (mail scanners prefetch links); the button POSTs the
 * token (to stop this kind of email, or all of the store's marketing email),
 * and each of Django's answers — 200, 400 — is its own state. One
 * `useEmailUnsubscribe` serves both trees; the webside page words and lays
 * out its states its own way and moves no focus.
 */
const TOKEN = 'a'.repeat(64)
const TYPE_URL = `/api/emails/unsubscribe/${TOKEN}`
const ALL_URL = `/api/emails/unsubscribe/${TOKEN}/all`

mockNuxtImport('useRoute', () => () => ({
  params: { token: TOKEN },
  query: {},
  path: `/email/unsubscribe/${TOKEN}`,
  fullPath: `/email/unsubscribe/${TOKEN}`,
  name: 'email-unsubscribe-token___el',
  meta: {},
  matched: [],
  hash: '',
}))

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

let page: Component = EmailUnsubscribe
/** The words of the tree under test: its own buttons and failure line. */
let words = { unsubscribeType: '', unsubscribeAll: '', failed: '' }
const mountPage = () => mountSuspended(page, { route: false })

type Scope = 'type' | 'all'
type Wrapper = Awaited<ReturnType<typeof mountPage>>

const buttonFor = (wrapper: Wrapper, scope: Scope) =>
  wrapper.findAll('button').find(b => b.text() === (scope === 'all' ? words.unsubscribeAll : words.unsubscribeType))

async function press(wrapper: Wrapper, scope: Scope = 'type') {
  await buttonFor(wrapper, scope)!.trigger('click')
  await flushPromises()
}

const URLS: Record<Scope, string> = { type: TYPE_URL, all: ALL_URL }
const SCOPES: Scope[] = ['type', 'all']

describe.each(trees(EmailUnsubscribe, WebsideEmailUnsubscribe))('$tree EmailUnsubscribe', ({ tree, C }) => {
  const defaultOnly = tree === 'default'
  const own = inlineCopy(`app/components/${defaultOnly ? '' : 'variants/webside/'}Storefront/EmailUnsubscribe.vue`)

  beforeEach(() => {
    page = C
    words = { unsubscribeType: own.unsubscribeType, unsubscribeAll: own.unsubscribeAll, failed: own.failed }
    api.routes({ [TYPE_URL]: () => undefined, [ALL_URL]: () => undefined })
  })

  it('unsubscribes nobody on its own: it waits for a button, and offers both', async () => {
    const wrapper = await mountPage()
    await flushPromises()

    expect(api.callsTo(TYPE_URL)).toEqual([])
    expect(api.callsTo(ALL_URL)).toEqual([])
    expect(buttonFor(wrapper, 'type')).toBeTruthy()
    expect(buttonFor(wrapper, 'all')).toBeTruthy()
    expect(wrapper.text()).toContain(own.prompt)
  })

  it.each(SCOPES)('POSTs the token for the %s scope only, and says which one happened', async (scope) => {
    const wrapper = await mountPage()

    await press(wrapper, scope)

    const other = scope === 'type' ? 'all' : 'type'
    expect(api.callsTo(URLS[scope])).toEqual([{ url: URLS[scope], options: { method: 'POST' } }])
    expect(api.callsTo(URLS[other])).toEqual([])
    const status = wrapper.find('[role="status"]')
    expect(status.text()).toContain(own.unsubscribed[scope].title)
    expect(status.text()).toContain(own.unsubscribed[scope].description)
    expect(status.text()).not.toContain(own.unsubscribed[other].title)
    expect(buttonFor(wrapper, 'type')).toBeUndefined()
    expect(buttonFor(wrapper, 'all')).toBeUndefined()
  })

  it.each(SCOPES)('shows the invalid-link state on a 400 from the %s scope, without a retry button', async (scope) => {
    api.routes({ [URLS[scope]]: failWith(400, { detail: 'x', code: 'unsubscribe_token_invalid' }) })
    const wrapper = await mountPage()

    await press(wrapper, scope)

    expect(wrapper.find('[role="alert"]').text()).toContain(own.invalid.title)
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(buttonFor(wrapper, 'type')).toBeUndefined()
    expect(buttonFor(wrapper, 'all')).toBeUndefined()
  })

  it.each(SCOPES)('keeps both buttons on any other failure of the %s scope, so the visitor can retry', async (scope) => {
    api.routes({ [URLS[scope]]: failWith(503, { detail: 'x' }) })
    const wrapper = await mountPage()

    await press(wrapper, scope)

    expect(wrapper.find('[role="alert"]').text()).toBe(words.failed)
    await press(wrapper, scope)
    expect(api.callsTo(URLS[scope])).toHaveLength(2)
    expect(buttonFor(wrapper, scope === 'type' ? 'all' : 'type')).toBeTruthy()
  })

  it('sends one request across both buttons while one is pending', async () => {
    let settle!: (value: unknown) => void
    api.routes({
      [TYPE_URL]: () => new Promise((resolve) => {
        settle = resolve
      }),
    })
    const wrapper = await mountPage()

    await buttonFor(wrapper, 'type')!.trigger('click')
    await buttonFor(wrapper, 'type')!.trigger('click')
    await buttonFor(wrapper, 'all')!.trigger('click')
    settle(undefined)
    await flushPromises()

    expect(api.callsTo(TYPE_URL)).toHaveLength(1)
    expect(api.callsTo(ALL_URL)).toEqual([])
  })

  describe.runIf(defaultOnly)('focus after a button is pressed', () => {
    const mountAttached = async () => {
      const wrapper = await mountSuspended(EmailUnsubscribe, { route: false, attachTo: document.body })
      await flushPromises()
      return wrapper
    }

    it.each(SCOPES)('moves to the heading of the %s success state, so it is read out', async (scope) => {
      const wrapper = await mountAttached()

      await press(wrapper, scope)

      expect(document.activeElement).toBe(wrapper.get('h1').element)
      expect(wrapper.get('h1').attributes('tabindex')).toBe('-1')
    })

    it('moves to the heading of the invalid-link state', async () => {
      api.routes({ [TYPE_URL]: failWith(400, { detail: 'x' }) })
      const wrapper = await mountAttached()

      await press(wrapper)

      expect(document.activeElement).toBe(wrapper.get('h1').element)
    })

    it('moves to the failure message when the unsubscribe did not go through', async () => {
      api.routes({ [TYPE_URL]: failWith(503, { detail: 'x' }) })
      const wrapper = await mountAttached()

      await press(wrapper)

      expect(document.activeElement).toBe(wrapper.get('[role="alert"]').element)
    })
  })
})
