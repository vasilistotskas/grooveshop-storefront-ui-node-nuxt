import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import OrderDetailPage from '~/components/Storefront/Account/OrderDetail.vue'
import { makeOrder } from '~~/test/fixtures/order'

/**
 * The specimen receipt button on the order page: next to the real receipt
 * button, and only while Django says the order may have one
 * (`hasSpecimenReceipt`: a demo store, shipped onwards). The webside
 * webside tree has none: webside is not a demo store.
 */
const state = vi.hoisted(() => ({ order: null as unknown }))
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())

mockNuxtImport('$api', () => api)
mockNuxtImport('useRoute', () => () => ({ name: 'account-orders-id___el', params: { id: '3' }, query: {}, path: '/account/orders/3', fullPath: '/account/orders/3', hash: '', meta: {}, matched: [] }))
mockNuxtImport('useOrder', () => () => ({ cancelOrder: vi.fn() }))
mockNuxtImport('useReorder', () => () => ({ reorder: vi.fn(), reordering: ref(null) }))

beforeEach(() => {
  clearNuxtData('order3')
  registerEndpoint('/api/orders/3', () => state.order)
})

async function mountPage(overrides: Parameters<typeof makeOrder>[0]) {
  state.order = makeOrder({ id: 3, ...overrides })
  const wrapper = await mountSuspended(OrderDetailPage)
  await flushPromises()
  return wrapper
}

describe('Storefront/Account/OrderDetail specimen receipt', () => {
  it('offers the specimen beside the real receipt', async () => {
    const wrapper = await mountPage({ hasInvoice: true, hasSpecimenReceipt: true })

    const specimen = wrapper.findComponent({ name: 'OrderSpecimenButton' })
    expect(specimen.props('orderId')).toBe(3)
    expect(specimen.text()).toBe('Δείγμα απόδειξης (όχι φορολογικό παραστατικό)')
    const receipt = wrapper.findAll('button').find(button => button.text() === 'Απόδειξη')
    expect(receipt?.element.parentElement).toBe(specimen.element.parentElement)
  })

  it('offers it without a real receipt too: the flag decides', async () => {
    const wrapper = await mountPage({ hasInvoice: false, hasSpecimenReceipt: true })

    expect(wrapper.findComponent({ name: 'OrderSpecimenButton' }).exists()).toBe(true)
  })

  it('hides it when Django does not offer one', async () => {
    const wrapper = await mountPage({ hasInvoice: true, hasSpecimenReceipt: false })

    expect(wrapper.findComponent({ name: 'OrderSpecimenButton' }).exists()).toBe(false)
  })
})
