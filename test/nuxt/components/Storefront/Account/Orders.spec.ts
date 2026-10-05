import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { createError, getQuery } from 'h3'
import { ref } from 'vue'
import OrdersPage from '~/components/Storefront/Account/Orders.vue'
import { makeOrderListItem } from '~~/test/fixtures/order'

/**
 * The shopper's orders: one row each, newest first unless the query says
 * otherwise, "Buy again" for an order that arrived, and pages beyond the
 * first eight.
 */
const state = vi.hoisted(() => ({ query: {} as Record<string, string>, count: 0, orders: [] as unknown[], fail: false }))
const { reorder } = vi.hoisted(() => ({ reorder: vi.fn((_id: number) => Promise.resolve()) }))

mockNuxtImport('useRoute', () => () => ({ name: 'account-orders___el', params: {}, query: state.query, path: '/account/orders', fullPath: '/account/orders', hash: '', meta: {}, matched: [] }))
mockNuxtImport('useReorder', () => () => ({ reorder, reordering: ref(null) }))

const asked: Record<string, unknown>[] = []

beforeEach(() => {
  asked.length = 0
  state.query = {}
  state.fail = false
  state.orders = [
    makeOrderListItem({ id: 3, status: 'SHIPPED', statusDisplay: 'Απεστάλη' }),
    makeOrderListItem({ id: 2, status: 'DELIVERED', statusDisplay: 'Παραδόθηκε' }),
  ]
  state.count = state.orders.length
  clearNuxtData('account-orders')
  registerEndpoint('/api/orders/my-orders', (event) => {
    asked.push(getQuery(event))
    if (state.fail) throw createError({ statusCode: 502 })
    return { count: state.count, results: state.orders }
  })
})

async function mountPage() {
  const wrapper = await mountSuspended(OrdersPage)
  await flushPromises()
  return wrapper
}

describe('Storefront/Account/Orders', () => {
  it('asks for the newest eight orders first', async () => {
    await mountPage()

    expect(asked[0]).toMatchObject({ page: '1', pageSize: '8', ordering: '-createdAt' })
  })

  it('keeps the page and the oldest-first sort from the query', async () => {
    state.query = { page: '2', ordering: 'createdAt' }

    await mountPage()

    expect(asked[0]).toMatchObject({ page: '2', ordering: 'createdAt' })
  })

  it('sorts newest first for any other sort the query names', async () => {
    state.query = { ordering: 'status' }

    await mountPage()

    expect(asked[0]).toMatchObject({ ordering: '-createdAt' })
  })

  it('lists each order with its status and a link to its page', async () => {
    const wrapper = await mountPage()
    const rows = wrapper.findAll('ul > li')

    expect(rows.map(row => row.text())).toEqual([
      expect.stringContaining('#3'),
      expect.stringContaining('#2'),
    ])
    expect(rows[0]!.text()).toContain('Απεστάλη')
    expect(rows[0]!.find('a').attributes('href')).toBe(useLocalePath()({ name: 'account-orders-id', params: { id: 3 } }))
    expect(wrapper.get('h1 + p').text()).toBe('2 παραγγελίες')
  })

  it('names the carrier on a row, and nothing for an order handled outside any carrier', async () => {
    state.orders = [
      makeOrderListItem({ id: 3, deliveryMethod: { providerCode: 'boxnow', providerName: 'BOX NOW', kind: 'pickup_point' } }),
      makeOrderListItem({ id: 2, deliveryMethod: { providerCode: null, providerName: null, kind: 'home_delivery' } }),
    ]

    const wrapper = await mountPage()
    const rows = wrapper.findAll('ul > li')

    expect(rows[0]!.text()).toMatch(/προϊόντα\s*·\s*BOX NOW/)
    expect(rows[1]!.text()).not.toMatch(/προϊόντα\s*·/)
  })

  it('offers "Buy again" for an order that arrived only', async () => {
    const wrapper = await mountPage()
    const rows = wrapper.findAll('ul > li')
    const buyAgain = (index: number) => rows[index]!.findAll('button').find(button => button.text() === 'Αγόρασέ τα ξανά')

    expect(buyAgain(0)).toBeUndefined()
    await buyAgain(1)!.trigger('click')
    expect(reorder).toHaveBeenCalledWith(2)
  })

  it('pages past eight orders', async () => {
    state.count = 20

    expect((await mountPage()).findComponent({ name: 'UPagination' }).props('total')).toBe(20)
  })

  it('says the orders did not load, not that there are none, and tries again', async () => {
    state.fail = true

    const wrapper = await mountPage()

    expect(wrapper.get('[role="alert"]').text()).toContain('Οι παραγγελίες δεν φορτώθηκαν.')
    expect(wrapper.text()).not.toContain('Καμία παραγγελία ακόμα')

    state.fail = false
    await wrapper.get('[role="alert"] button').trigger('click')
    await vi.waitFor(() => expect(wrapper.findAll('ul > li')).toHaveLength(2))
  })

  it('invites a shopper without orders to start shopping', async () => {
    state.orders = []
    state.count = 0

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Καμία παραγγελία ακόμα')
    expect(wrapper.findComponent({ name: 'UPagination' }).exists()).toBe(false)
  })
})
