import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import type { ProductAlertKindEnum } from '~~/shared/openapi/types.gen'
import { DATA_MAX_PAGE_SIZE } from '~~/shared/constants/builder'
import { makeProductAlert, makeProductAlertPage } from '~~/test/fixtures/product'

/**
 * The shopper's active alert on a product, as every trigger and dialog on a
 * page reads it: one list per page, read in the browser after mount, and no
 * alert drawn before the reader has mounted, so the anonymous cached HTML and
 * the first render agree.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const { session } = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return { session: { loggedIn: ref(false), user: ref<{ id: number, email: string } | null>(null) } }
})
mockNuxtImport('useUserSession', () => () => ({
  ...session,
  session: { value: {} },
  ready: { value: true },
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

const ALERTS = '/api/products/alerts'

const alert = (product: number, kind: ProductAlertKindEnum = 'restock') => makeProductAlert({ id: product, product, kind })

/** A reader that records what each of its renders drew. */
function reader(renders: string[] = []) {
  return defineComponent({
    props: { productId: { type: Number, required: true }, kind: { type: String as () => ProductAlertKindEnum, default: 'restock' } },
    setup(props) {
      const { activeAlert } = useProductActiveAlert({ productId: () => props.productId, kind: () => props.kind })
      return () => {
        const drawn = activeAlert.value ? 'on' : 'off'
        renders.push(drawn)
        return h('span', drawn)
      }
    },
  })
}

const signIn = () => {
  session.loggedIn.value = true
  session.user.value = { id: 7, email: 'maria@example.com' }
}

describe('useProductActiveAlert', () => {
  beforeEach(() => {
    clearNuxtData()
    session.loggedIn.value = false
    session.user.value = null
    api.routes({ [ALERTS]: () => makeProductAlertPage([]) })
  })

  it('looks up no guest', async () => {
    const wrapper = await mountSuspended(reader(), { props: { productId: 3 }, route: false })
    await flushPromises()

    expect(api.callsTo(ALERTS)).toHaveLength(0)
    expect(wrapper.text()).toBe('off')
  })

  // A card hydrated on scroll mounts after another reader filled the list:
  // its first render is the hydration of the guest HTML it was sent.
  it('draws no alert before it has mounted, even when the page\'s list already holds one', async () => {
    signIn()
    api.routes({ [ALERTS]: () => makeProductAlertPage([alert(3)]) })
    const first = await mountSuspended(reader(), { props: { productId: 3 }, route: false })
    await flushPromises()
    expect(first.text()).toBe('on')

    const renders: string[] = []
    const later = await mountSuspended(reader(renders), { props: { productId: 3 }, route: false })
    await flushPromises()

    expect(renders[0]).toBe('off')
    expect(later.text()).toBe('on')
  })

  it('reads the list once for every reader on the page, a reader mounted later included', async () => {
    signIn()
    api.routes({ [ALERTS]: () => makeProductAlertPage([alert(3), alert(4, 'price_drop')]) })
    const Page = defineComponent({
      setup: () => () => [3, 4, 5].map(productId => h(reader(), { productId })),
    })
    const page = await mountSuspended(Page, { route: false })
    await flushPromises()
    const later = await mountSuspended(reader(), { props: { productId: 4, kind: 'price_drop' }, route: false })
    await flushPromises()

    expect(api.callsTo(ALERTS)).toEqual([{ url: ALERTS, options: expect.objectContaining({ query: { isActive: true, page: 1, pageSize: DATA_MAX_PAGE_SIZE } }) }])
    // Each reader takes its own product and kind from the one list.
    expect(page.findAll('span').map(span => span.text())).toEqual(['on', 'off', 'off'])
    expect(later.text()).toBe('on')
  })

  // Another shopper signs in on the same tab while the first one's read is
  // on its way: that read must not leave the first shopper's alerts on the
  // page.
  it('never shows the alerts of the shopper signed in before', async () => {
    signIn()
    let releaseFirst: (() => void) | undefined
    api.routes({
      [ALERTS]: () => (api.callsTo(ALERTS).length === 1
        ? new Promise((resolve) => {
            releaseFirst = () => resolve(makeProductAlertPage([alert(3)]))
          })
        : makeProductAlertPage([])),
    })
    const wrapper = await mountSuspended(reader(), { props: { productId: 3 }, route: false })
    await flushPromises()
    expect(releaseFirst).toBeDefined()

    session.user.value = { id: 8, email: 'nikos@example.com' }
    await flushPromises()
    releaseFirst!()
    await flushPromises()

    expect(api.callsTo(ALERTS)).toHaveLength(2)
    expect(wrapper.text()).toBe('off')
  })

  it('reads every page of a long list', async () => {
    signIn()
    api.routes({
      [ALERTS]: (_url: string, options: { query: { page: number } }) => (options.query.page === 1
        ? makeProductAlertPage([alert(3)], `https://api.example.com${ALERTS}?page=2`)
        : makeProductAlertPage([alert(9)])),
    })
    const wrapper = await mountSuspended(reader(), { props: { productId: 9 }, route: false })
    await flushPromises()

    expect(api.callsTo(ALERTS).map(call => call.options.query.page)).toEqual([1, 2])
    expect(wrapper.text()).toBe('on')
  })
})
