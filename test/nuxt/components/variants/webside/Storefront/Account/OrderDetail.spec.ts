import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import WebsideOrderDetail from '~/components/variants/webside/Storefront/Account/OrderDetail.vue'
import { makeOrder } from '~~/test/fixtures/order'
import { setTenant } from '~~/test/helpers/tenant'
import { failWith } from '~~/test/helpers/api'

/**
 * Webside's order page draws its own look over the platform's invoice
 * behaviour (`useOrderInvoice`): the tab opens on the click itself, and a
 * failed request tells the shopper the reason Django gave.
 */
const state = vi.hoisted(() => ({ order: null as unknown }))
const { cancelOrder, reorder, toastAdd } = vi.hoisted(() => ({
  cancelOrder: vi.fn((_id: number) => Promise.resolve({})),
  reorder: vi.fn((_id: number) => Promise.resolve()),
  toastAdd: vi.fn(),
}))
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())

mockNuxtImport('$api', () => api)
mockNuxtImport('useRoute', () => () => ({ name: 'account-orders-id___el', params: { id: '3' }, query: {}, path: '/account/orders/3', fullPath: '/account/orders/3', hash: '', meta: {}, matched: [] }))
mockNuxtImport('useOrder', () => () => ({ cancelOrder }))
mockNuxtImport('useReorder', () => () => ({ reorder, reordering: ref(null) }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

beforeEach(() => {
  setTenant()
  state.order = makeOrder({ id: 3, hasInvoice: true })
  clearNuxtData('order3')
  registerEndpoint('/api/orders/3', () => state.order)
})

async function mountPage() {
  const wrapper = await mountSuspended(WebsideOrderDetail)
  await flushPromises()
  return wrapper
}

const invoiceButton = (wrapper: VueWrapper) =>
  wrapper.findAll('button').find(control => control.text() === 'Λήψη απόδειξης')

/** A tab as `window.open` hands it back, with what the page does to it recorded. */
function fakeTab() {
  return { opener: {} as unknown, location: { href: '' }, close: vi.fn() }
}

describe('webside Storefront/Account/OrderDetail invoice', () => {
  it('opens the tab on the click itself, then points it at the signed link', async () => {
    api.routes({ '/api/orders/3/invoice': { downloadUrl: 'https://cdn.example/invoice.pdf' } })
    const tab = fakeTab()
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)

    const wrapper = await mountPage()
    await invoiceButton(wrapper)!.trigger('click')
    // Opened before the request answers: Safari blocks a tab opened later.
    expect(open).toHaveBeenCalledWith('', '_blank')
    await flushPromises()

    expect(tab.opener).toBeNull()
    expect(tab.location.href).toBe('https://cdn.example/invoice.pdf')
  })

  it('says the reason Django gives when the invoice cannot be had, and closes the tab', async () => {
    api.routes({ '/api/orders/3/invoice': failWith(409, { detail: 'Το παραστατικό εκδίδεται ακόμη.' }) })
    const tab = fakeTab()
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)

    const wrapper = await mountPage()
    await invoiceButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(tab.close).toHaveBeenCalled()
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      color: 'error',
      description: expect.stringContaining('Το παραστατικό εκδίδεται ακόμη.'),
    }))
  })
})
