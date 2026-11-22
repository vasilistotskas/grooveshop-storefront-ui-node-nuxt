import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import RestockAlert from '~/components/Product/RestockAlert.vue'
import { makeProductAlert, makeProductAlertPage } from '~~/test/fixtures/product'
import { DATA_MAX_PAGE_SIZE } from '~~/shared/constants/builder'

/**
 * The platform's "notify me when it's back": a compact button that opens
 * the alerts dialog on the restock alert, the dialog mounted on the first
 * open. Its classes go on the button, where the caller places it. Once the
 * signed-in shopper has set the alert, it says so.
 */
vi.mock('~/components/Product/NotifyMe.vue', () => ({
  default: { props: ['open', 'kind', 'productId', 'soldOut', 'priceDrop'], template: '<div data-test="dialog" :data-open="String(open)" :data-kind="kind" :data-product="productId" />' },
}))

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

const mountAlert = async (props: { iconOnly?: boolean } = {}) => {
  const wrapper = await mountSuspended(RestockAlert, {
    route: false,
    props: { productId: 7, productName: 'Φορτιστής', productImage: null, ...props },
    attrs: { class: 'self-start' },
  })
  await flushPromises()
  return wrapper
}

describe('Product/RestockAlert', () => {
  beforeEach(() => {
    clearNuxtData()
    session.loggedIn.value = false
    session.user.value = null
    api.routes({ [ALERTS]: () => makeProductAlertPage([]) })
  })

  it('opens the restock alert for the product, mounting the dialog on the first open', async () => {
    const wrapper = await mountAlert()
    expect(wrapper.find('[data-test="dialog"]').exists()).toBe(false)

    await wrapper.get('button').trigger('click')

    await vi.waitFor(() => expect(wrapper.find('[data-test="dialog"]').exists()).toBe(true))
    const dialog = wrapper.get('[data-test="dialog"]')
    expect([dialog.attributes('data-open'), dialog.attributes('data-kind'), dialog.attributes('data-product')]).toEqual(['true', 'restock', '7'])
  })

  // The visible label is short; the name is the sentence, and starts with
  // the label (WCAG 2.5.3). The bell alone keeps the name.
  it('is a short label, or the bell alone, named by the whole sentence', async () => {
    const labelled = await mountAlert()
    expect(labelled.get('button').text()).toBe('Ειδοποίηση')
    expect(labelled.get('button').attributes('aria-label')).toBe('Ειδοποίηση όταν ξαναέρθει')

    const icon = await mountAlert({ iconOnly: true })
    expect(icon.get('button').text()).toBe('')
    expect(icon.get('button').attributes('aria-label')).toBe('Ειδοποίηση όταν ξαναέρθει')
    // The caller widens it to a 44px target: the bell stays in the middle.
    expect(icon.get('button').classes()).toContain('justify-center')
  })

  // The classes are the contract: a phone's tap target is at least 44px
  // (WCAG 2.5.5); from `sm` up the button keeps its size. The caller's
  // classes land on the button too.
  it('is a 44px target on a phone, and takes the caller\'s placement', async () => {
    const wrapper = await mountAlert()

    expect(wrapper.get('button').classes()).toEqual(expect.arrayContaining(['min-h-11', 'sm:min-h-0', 'self-start']))
  })

  // A cached page renders the guest, and the session arrives after mount:
  // the alert is read then, never in the server render.
  it('looks up no guest, and says the alert is on once the shopper is signed in', async () => {
    api.routes({
      [ALERTS]: () => makeProductAlertPage([makeProductAlert({ product: 7, user: 3 })]),
    })
    const wrapper = await mountAlert()
    expect(api.callsTo(ALERTS)).toHaveLength(0)
    expect(wrapper.get('button').text()).toBe('Ειδοποίηση')

    session.loggedIn.value = true
    session.user.value = { id: 3, email: 'maria@example.com' }
    await flushPromises()

    expect(api.callsTo(ALERTS)).toEqual([{ url: ALERTS, options: expect.objectContaining({ query: { isActive: true, page: 1, pageSize: DATA_MAX_PAGE_SIZE } }) }])
    expect(wrapper.get('button').text()).toBe('Ενεργή')
    expect(wrapper.get('button').attributes('aria-label')).toBe('Ενεργή ειδοποίηση διαθεσιμότητας')
  })
})
