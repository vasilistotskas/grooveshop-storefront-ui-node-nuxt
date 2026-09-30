import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { Order } from '~~/shared/openapi/types.gen'
import OrderCard from '~/components/Order/Card.vue'
import { makeOrderListItem } from '~~/test/fixtures/order'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn() }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

/**
 * An account-list order, cancellable, paid on delivery, with no lines —
 * the kit's list row with the money and names this card shows.
 */
const makeOrder = (overrides: Partial<Order> = {}): Order => makeOrderListItem({
  id: 42,
  user: 7,
  street: 'Ερμού',
  streetNumber: '1',
  firstName: 'Μαρία',
  lastName: 'Παπαδοπούλου',
  paidAmount: 62,
  shippingPrice: 3.5,
  totalPriceItems: 58.5,
  totalPriceExtra: 3.5,
  fullAddress: 'Ερμού 1, Αθήνα 10563',
  ...overrides,
})

const t = (key: string) => useNuxtApp().$i18n.t(key)
const failWith = (statusCode: number) => () => {
  throw Object.assign(new Error('Request failed'), { statusCode })
}

const mountCard = (order = makeOrder()) =>
  mountSuspended(OrderCard, { props: { order }, global: { stubs: { OrderCardItem: true } }, route: false })

const cancelButton = (wrapper: Awaited<ReturnType<typeof mountCard>>) => {
  const buttons = wrapper.findAll('button').filter(button => button.text() === 'Ακύρωση')
  expect(buttons).toHaveLength(1)
  return buttons[0]!
}

describe('Order/Card', () => {
  it('cancels the order and asks the list to refetch, leaving the confirmation to the WebSocket toast', async () => {
    api.routes({ '/api/orders/42/cancel': () => ({}) })
    const wrapper = await mountCard()

    await cancelButton(wrapper).trigger('click')
    await flushPromises()

    expect(api.callsTo('/api/orders/42/cancel')).toEqual([
      { url: '/api/orders/42/cancel', options: expect.objectContaining({ method: 'POST', body: {} }) },
    ])
    expect(wrapper.emitted('cancelled')).toEqual([[42]])
    expect(toastAdd).not.toHaveBeenCalled()
  })

  // Someone already cancelled it in another tab, or it shipped: the
  // card's `canBeCanceled` is stale, so the list refetches.
  it.each([409, 400])('explains a %i refusal and still asks the list to refetch', async (status) => {
    api.routes({ '/api/orders/42/cancel': failWith(status) })
    const wrapper = await mountCard()

    await cancelButton(wrapper).trigger('click')
    await flushPromises()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Αποτυχία ακύρωσης',
      description: 'Η παραγγελία δεν μπορεί πλέον να ακυρωθεί.',
      color: 'error',
    }))
    expect(wrapper.emitted('cancelled')).toEqual([[42]])
  })

  it('reports any other failure generically and leaves the list alone', async () => {
    api.routes({ '/api/orders/42/cancel': failWith(502) })
    const wrapper = await mountCard()

    await cancelButton(wrapper).trigger('click')
    await flushPromises()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      description: 'Δεν μπορέσαμε να ακυρώσουμε την παραγγελία.',
      color: 'error',
    }))
    expect(wrapper.emitted('cancelled')).toBeUndefined()
  })

  it('sends one cancellation however often the button is pressed while it is in flight', async () => {
    let settle!: () => void
    api.routes({ '/api/orders/42/cancel': () => new Promise<void>((resolve) => { settle = resolve }) })
    const wrapper = await mountCard()

    await cancelButton(wrapper).trigger('click')
    await cancelButton(wrapper).trigger('click')
    expect(cancelButton(wrapper).attributes('disabled')).toBeDefined()

    settle()
    await flushPromises()

    expect(api.callsTo('/api/orders/42/cancel')).toHaveLength(1)
    expect(cancelButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('offers no cancel button, and no "cancellable" badge, once the order can no longer be cancelled', async () => {
    const wrapper = await mountCard(makeOrder({ canBeCanceled: false, status: 'SHIPPED', statusDisplay: 'Απεστάλη' }))

    expect(wrapper.findAll('button').filter(button => button.text() === 'Ακύρωση')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('Ακυρώσιμη')
  })

  it('shows the shopper\'s own payment choice, the shipping cost and the amount paid', async () => {
    const wrapper = await mountCard(makeOrder({ isPaid: true }))

    expect(wrapper.text()).toContain(t('payment_methods.PAY_ON_DELIVERY'))
    expect(wrapper.text()).toContain(useNuxtApp().$i18n.n(3.5, 'currency'))
    expect(wrapper.text()).toContain(useNuxtApp().$i18n.n(62, 'currency'))
    expect(wrapper.text()).toContain('Πληρωμένη')
  })

  it.each([
    ['PENDING', 'warning'],
    ['PROCESSING', 'info'],
    ['SHIPPED', 'primary'],
    ['DELIVERED', 'success'],
    ['COMPLETED', 'success'],
    ['CANCELED', 'error'],
    ['REFUNDED', 'error'],
    ['RETURNED', 'neutral'],
  ] as const)('colours a %s order status %s', async (status, color) => {
    const wrapper = await mountCard(makeOrder({ status, statusDisplay: `status:${status}` }))

    const badge = wrapper.findAllComponents({ name: 'UBadge' }).find(b => b.text() === `status:${status}`)
    expect(badge?.props('color')).toBe(color)
  })
})
