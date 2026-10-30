import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Component } from 'vue'
import ProductAlertConfirm from '~/components/Storefront/ProductAlertConfirm.vue'
import WebsideProductAlertConfirm from '~/components/variants/webside/Storefront/ProductAlertConfirm.vue'
import { failWith } from '~~/test/helpers/api'
import { inlineCopy } from '~~/test/helpers/inlineCopy'
import { trees } from '~~/test/helpers/trees'

/**
 * The page a guest's alert confirmation email links to. Opening it must
 * start NOTHING (mail scanners prefetch links); the button POSTs the
 * token, and each of Django's answers (200 with the alert's kind, 410,
 * 400) is its own state. One `useProductAlertConfirm` serves both trees;
 * the webside page words and lays out its states its own way and moves no
 * focus.
 */
// A real token is `base64:timestamp:signature`: it carries `:` and `-`.
const TOKEN = 'Zm9vQGV4YW1wbGUuY29t:1k2j3h:abc-DEF_123'
const CONFIRM_URL = `/api/products/alerts/confirm/${encodeURIComponent(TOKEN)}`

mockNuxtImport('useRoute', () => () => ({
  params: { token: TOKEN },
  query: {},
  path: `/alerts/confirm/${TOKEN}`,
  fullPath: `/alerts/confirm/${TOKEN}`,
  name: 'alerts-confirm-token___el',
  meta: {},
  matched: [],
  hash: '',
}))

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

let page: Component = ProductAlertConfirm
const mountPage = () => mountSuspended(page, { route: false })
type Mounted = Awaited<ReturnType<typeof mountPage>>

describe.each(trees(ProductAlertConfirm, WebsideProductAlertConfirm))('$tree ProductAlertConfirm', ({ tree, C }) => {
  const defaultOnly = tree === 'default'
  const own = inlineCopy(`app/components/${defaultOnly ? '' : 'variants/webside/'}Storefront/ProductAlertConfirm.vue`)

  const button = (wrapper: Mounted) => wrapper.findAll('button').find(b => b.text() === own.confirm)
  async function press(wrapper: Mounted) {
    await button(wrapper)!.trigger('click')
    await flushPromises()
  }

  beforeEach(() => {
    page = C
    api.routes({ [CONFIRM_URL]: { status: 'confirmed', kind: 'restock' } })
  })

  it('starts nothing on its own: it waits for the button', async () => {
    const wrapper = await mountPage()
    await flushPromises()

    expect(api.callsTo(CONFIRM_URL)).toEqual([])
    expect(button(wrapper)).toBeTruthy()
  })

  it('POSTs the encoded token once, and moves to the confirmed state', async () => {
    const wrapper = await mountPage()

    await press(wrapper)

    expect(api.callsTo(CONFIRM_URL)).toEqual([{ url: CONFIRM_URL, options: { method: 'POST' } }])
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(button(wrapper)).toBeUndefined()
  })

  it.each(['restock', 'price_drop'] as const)('says which alert started: %s', async (kind) => {
    api.routes({ [CONFIRM_URL]: { status: 'confirmed', kind } })
    const wrapper = await mountPage()

    await press(wrapper)

    const status = wrapper.find('[role="status"]').text()
    expect(status).toContain(own.confirmed.title)
    expect(status).toContain(own.confirmed[kind])
  })

  it('offers to continue shopping once confirmed', async () => {
    const wrapper = await mountPage()

    await press(wrapper)

    expect(wrapper.findAll('a').map(link => [link.text(), link.attributes('href')])).toEqual([[own.shop, '/products']])
  })

  it.each([
    { status: 410, key: 'expired' },
    { status: 400, key: 'invalid' },
  ])('ends on its own state on $status, without a retry button', async ({ status, key }) => {
    api.routes({ [CONFIRM_URL]: failWith(status, { code: 'x' }) })
    const wrapper = await mountPage()

    await press(wrapper)

    const alert = wrapper.find('[role="alert"]').text()
    expect(alert).toContain(own[key].title)
    expect(alert).toContain(own[key].description)
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(button(wrapper)).toBeUndefined()
    expect(wrapper.findAll('a').map(link => [link.text(), link.attributes('href')])).toEqual([[own.home, '/']])
  })

  it('keeps the button on any other failure, so the visitor can retry', async () => {
    api.routes({ [CONFIRM_URL]: failWith(503, { detail: 'x' }) })
    const wrapper = await mountPage()

    await press(wrapper)

    expect(wrapper.find('[role="alert"]').text()).toBe(own.failed)
    await press(wrapper)
    expect(api.callsTo(CONFIRM_URL)).toHaveLength(2)
  })

  it('sends one request however often the button is pressed while it is pending', async () => {
    let settle!: (value: unknown) => void
    api.routes({
      [CONFIRM_URL]: () => new Promise((resolve) => {
        settle = resolve
      }),
    })
    const wrapper = await mountPage()

    await button(wrapper)!.trigger('click')
    await button(wrapper)!.trigger('click')
    settle({ status: 'confirmed', kind: 'restock' })
    await flushPromises()

    expect(api.callsTo(CONFIRM_URL)).toHaveLength(1)
  })

  describe.runIf(defaultOnly)('focus after the button is pressed', () => {
    const mountAttached = async () => {
      const wrapper = await mountSuspended(ProductAlertConfirm, { route: false, attachTo: document.body })
      await flushPromises()
      return wrapper
    }

    it('moves to the heading of the confirmed state, so it is read out', async () => {
      const wrapper = await mountAttached()

      await press(wrapper)

      expect(document.activeElement).toBe(wrapper.get('h1').element)
    })

    it.each([410, 400])('moves to the heading of the %i state', async (status) => {
      api.routes({ [CONFIRM_URL]: failWith(status, { code: 'x' }) })
      const wrapper = await mountAttached()

      await press(wrapper)

      expect(document.activeElement).toBe(wrapper.get('h1').element)
    })

    it('moves to the failure message when the confirmation did not go through', async () => {
      api.routes({ [CONFIRM_URL]: failWith(503, { detail: 'x' }) })
      const wrapper = await mountAttached()

      await press(wrapper)

      expect(document.activeElement).toBe(wrapper.get('[role="alert"]').element)
    })
  })
})
