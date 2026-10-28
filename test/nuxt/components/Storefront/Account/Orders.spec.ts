import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { Component } from 'vue'
import { createError, getQuery } from 'h3'
import { defineComponent, h, ref } from 'vue'
import OrdersPage from '~/components/Storefront/Account/Orders.vue'
import WebsideOrdersPage from '~/components/variants/webside/Storefront/Account/Orders.vue'
import { makeOrderListItem } from '~~/test/fixtures/order'
import { inlineCopy } from '~~/test/helpers/inlineCopy'
import { trees } from '~~/test/helpers/trees'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * The shopper's orders: one row each, newest first unless the query says
 * otherwise, "Buy again" for an order that arrived, and pages beyond the
 * first eight. One `useMyOrdersPage` serves both trees; the webside one
 * lets the shopper sort by status and updated time too, and its list of
 * cards reports a cancelled order so the page reloads.
 */
const state = vi.hoisted(() => ({ query: {} as Record<string, string>, count: 0, orders: [] as unknown[], fail: false }))
const { reorder } = vi.hoisted(() => ({ reorder: vi.fn((_id: number) => Promise.resolve()) }))

mockNuxtImport('useRoute', () => () => ({ name: 'account-orders___el', params: {}, query: state.query, path: '/account/orders', fullPath: '/account/orders', hash: '', meta: {}, matched: [] }))
mockNuxtImport('useReorder', () => () => ({ reorder, reordering: ref(null) }))

/** The webside design's list of order cards, naming the orders and reporting a cancellation as the real one does. */
vi.mock('~/components/variants/webside/Order/List.vue', () => ({
  default: defineComponent({
    props: { orders: { type: Array, required: true } },
    emits: ['cancelled'],
    setup(props, { emit }) {
      return () => h('ol', (props.orders as Array<{ id: number }>).map(order =>
        h('li', { 'data-order': '', 'onClick': () => emit('cancelled', order.id) }, String(order.id))))
    },
  }),
}))

const asked: Record<string, unknown>[] = []

beforeEach(() => {
  setTenant()
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

async function mountPage(C: Component = OrdersPage) {
  const wrapper = await mountSuspended(C)
  await flushPromises()
  return wrapper
}

describe.each(trees(OrdersPage, WebsideOrdersPage))('$tree Storefront/Account/Orders', ({ tree, C }) => {
  const defaultOnly = tree === 'default'

  it('asks for the newest eight orders first', async () => {
    await mountPage(C)

    expect(asked[0]).toMatchObject({ page: '1', pageSize: '8', ordering: '-createdAt' })
  })

  it('keeps the page and the oldest-first sort from the query', async () => {
    state.query = { page: '2', ordering: 'createdAt' }

    await mountPage(C)

    expect(asked[0]).toMatchObject({ page: '2', ordering: 'createdAt' })
  })

  it.runIf(defaultOnly)('sorts newest first for any other sort the query names', async () => {
    state.query = { ordering: 'status' }

    await mountPage(C)

    expect(asked[0]).toMatchObject({ ordering: '-createdAt' })
  })

  it.runIf(!defaultOnly)('sorts by status, which the webside page offers', async () => {
    state.query = { ordering: 'status' }

    await mountPage(C)

    expect(asked[0]).toMatchObject({ ordering: 'status' })
  })

  it('asks once for a page', async () => {
    await mountPage(C)

    expect(asked).toHaveLength(1)
  })

  it.runIf(!defaultOnly)('lists the orders and reloads them when one is cancelled', async () => {
    const wrapper = await mountPage(C)
    await vi.waitFor(() => expect(wrapper.findAll('[data-order]').map(row => row.text())).toEqual(['3', '2']))

    await wrapper.get('[data-order]').trigger('click')

    await vi.waitFor(() => expect(asked).toHaveLength(2))
  })

  it('invites a shopper without orders to start shopping', async () => {
    state.orders = []
    state.count = 0

    const wrapper = await mountPage(C)

    expect(wrapper.text()).toContain(defaultOnly
      ? 'Καμία παραγγελία ακόμα'
      : inlineCopy('app/components/variants/webside/Storefront/Account/Orders.vue').empty.title)
    expect(wrapper.findComponent({ name: 'UPagination' }).exists()).toBe(false)
  })

  it.runIf(defaultOnly)('lists each order with its status and a link to its page', async () => {
    const wrapper = await mountPage(C)
    const rows = wrapper.findAll('ul > li')

    expect(rows.map(row => row.text())).toEqual([
      expect.stringContaining('#3'),
      expect.stringContaining('#2'),
    ])
    expect(rows[0]!.text()).toContain('Απεστάλη')
    expect(rows[0]!.find('a').attributes('href')).toBe(useLocalePath()({ name: 'account-orders-id', params: { id: 3 } }))
    expect(wrapper.get('h1 + p').text()).toBe('2 παραγγελίες')
  })

  it.runIf(defaultOnly)('names the carrier on a row, and nothing for an order handled outside any carrier', async () => {
    state.orders = [
      makeOrderListItem({ id: 3, deliveryMethod: { providerCode: 'boxnow', providerName: 'BOX NOW', kind: 'pickup_point' } }),
      makeOrderListItem({ id: 2, deliveryMethod: { providerCode: null, providerName: null, kind: 'home_delivery' } }),
    ]

    const wrapper = await mountPage(C)
    const rows = wrapper.findAll('ul > li')

    expect(rows[0]!.text()).toMatch(/προϊόντα\s*·\s*BOX NOW/)
    expect(rows[1]!.text()).not.toMatch(/προϊόντα\s*·/)
  })

  it.runIf(defaultOnly)('offers "Buy again" for an order that arrived only', async () => {
    const wrapper = await mountPage(C)
    const rows = wrapper.findAll('ul > li')
    const buyAgain = (index: number) => rows[index]!.findAll('button').find(button => button.text() === 'Αγόρασέ τα ξανά')

    expect(buyAgain(0)).toBeUndefined()
    await buyAgain(1)!.trigger('click')
    expect(reorder).toHaveBeenCalledWith(2)
  })

  it.runIf(defaultOnly)('offers no "Buy again" on a store without a cart to put the order in', async () => {
    setTenantFeatures({ cart: false })
    const wrapper = await mountPage(C)

    expect(wrapper.findAll('button').filter(button => button.text() === 'Αγόρασέ τα ξανά')).toHaveLength(0)
  })

  it.runIf(defaultOnly)('pages past eight orders', async () => {
    state.count = 20

    expect((await mountPage(C)).findComponent({ name: 'UPagination' }).props('total')).toBe(20)
  })

  it.runIf(defaultOnly)('says the orders did not load, not that there are none, and tries again', async () => {
    state.fail = true

    const wrapper = await mountPage(C)

    expect(wrapper.get('[role="alert"]').text()).toContain('Οι παραγγελίες δεν φορτώθηκαν.')
    expect(wrapper.text()).not.toContain('Καμία παραγγελία ακόμα')

    state.fail = false
    await wrapper.get('[role="alert"] button').trigger('click')
    await vi.waitFor(() => expect(wrapper.findAll('ul > li')).toHaveLength(2))
  })
})
