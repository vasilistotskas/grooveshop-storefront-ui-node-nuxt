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
 * token, and each of Django's answers — 200, 400 — is its own state. One
 * `useEmailUnsubscribe` serves both trees; the webside page words and lays
 * out its states its own way and moves no focus.
 */
const TOKEN = 'a'.repeat(64)
const UNSUBSCRIBE_URL = `/api/emails/unsubscribe/${TOKEN}`

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
/** The words of the tree under test: its own button and failure line. */
let words = { confirm: '', failed: '' }
const mountPage = () => mountSuspended(page, { route: false })

const unsubscribeButton = (wrapper: Awaited<ReturnType<typeof mountPage>>) =>
  wrapper.findAll('button').find(b => b.text() === words.confirm)

async function pressUnsubscribe(wrapper: Awaited<ReturnType<typeof mountPage>>) {
  await unsubscribeButton(wrapper)!.trigger('click')
  await flushPromises()
}

describe.each(trees(EmailUnsubscribe, WebsideEmailUnsubscribe))('$tree EmailUnsubscribe', ({ tree, C }) => {
  const defaultOnly = tree === 'default'
  const own = inlineCopy(`app/components/${defaultOnly ? '' : 'variants/webside/'}Storefront/EmailUnsubscribe.vue`)

  beforeEach(() => {
    page = C
    words = { confirm: own.confirm, failed: own.failed }
    api.routes({ [UNSUBSCRIBE_URL]: () => undefined })
  })

  it('unsubscribes nobody on its own: it waits for the button', async () => {
    const wrapper = await mountPage()
    await flushPromises()

    expect(api.callsTo(UNSUBSCRIBE_URL)).toEqual([])
    expect(unsubscribeButton(wrapper)).toBeTruthy()
    expect(wrapper.text()).toContain(own.prompt)
  })

  it('POSTs the token and says the visitor will not receive the emails any more', async () => {
    const wrapper = await mountPage()

    await pressUnsubscribe(wrapper)

    expect(api.callsTo(UNSUBSCRIBE_URL)).toEqual([{ url: UNSUBSCRIBE_URL, options: { method: 'POST' } }])
    const status = wrapper.find('[role="status"]')
    expect(status.text()).toContain(own.unsubscribed.title)
    expect(status.text()).toContain(own.unsubscribed.description)
    expect(unsubscribeButton(wrapper)).toBeUndefined()
  })

  it('shows the invalid-link state on 400, without a retry button', async () => {
    api.routes({ [UNSUBSCRIBE_URL]: failWith(400, { detail: 'x', code: 'unsubscribe_token_invalid' }) })
    const wrapper = await mountPage()

    await pressUnsubscribe(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toContain(own.invalid.title)
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(unsubscribeButton(wrapper)).toBeUndefined()
  })

  it('keeps the button on any other failure, so the visitor can retry', async () => {
    api.routes({ [UNSUBSCRIBE_URL]: failWith(503, { detail: 'x' }) })
    const wrapper = await mountPage()

    await pressUnsubscribe(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toBe(words.failed)
    await pressUnsubscribe(wrapper)
    expect(api.callsTo(UNSUBSCRIBE_URL)).toHaveLength(2)
  })

  it('sends one request however often the button is pressed while it is pending', async () => {
    let settle!: (value: unknown) => void
    api.routes({
      [UNSUBSCRIBE_URL]: () => new Promise((resolve) => {
        settle = resolve
      }),
    })
    const wrapper = await mountPage()

    await unsubscribeButton(wrapper)!.trigger('click')
    await unsubscribeButton(wrapper)!.trigger('click')
    settle(undefined)
    await flushPromises()

    expect(api.callsTo(UNSUBSCRIBE_URL)).toHaveLength(1)
  })

  describe.runIf(defaultOnly)('focus after the button is pressed', () => {
    const mountAttached = async () => {
      const wrapper = await mountSuspended(EmailUnsubscribe, { route: false, attachTo: document.body })
      await flushPromises()
      return wrapper
    }

    it('moves to the heading of the unsubscribed state, so it is read out', async () => {
      const wrapper = await mountAttached()

      await pressUnsubscribe(wrapper)

      expect(document.activeElement).toBe(wrapper.get('h1').element)
      expect(wrapper.get('h1').attributes('tabindex')).toBe('-1')
    })

    it('moves to the heading of the invalid-link state', async () => {
      api.routes({ [UNSUBSCRIBE_URL]: failWith(400, { detail: 'x' }) })
      const wrapper = await mountAttached()

      await pressUnsubscribe(wrapper)

      expect(document.activeElement).toBe(wrapper.get('h1').element)
    })

    it('moves to the failure message when the unsubscribe did not go through', async () => {
      api.routes({ [UNSUBSCRIBE_URL]: failWith(503, { detail: 'x' }) })
      const wrapper = await mountAttached()

      await pressUnsubscribe(wrapper)

      expect(document.activeElement).toBe(wrapper.get('[role="alert"]').element)
    })
  })
})
