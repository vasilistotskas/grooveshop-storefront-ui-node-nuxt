import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { OrderDetail } from '~~/shared/openapi/types.gen'
import OrderAwaitingPaymentReminder from '~/components/Order/AwaitingPaymentReminder.vue'
import payNowSource from '~/components/Order/PayNow.vue?raw'
import { makeOrder } from '~~/test/fixtures/order'
import { failWith } from '~~/test/helpers/api'
import { componentTexts } from '~~/test/helpers/componentTexts'

const texts = componentTexts(payNowSource, 'PayNow.vue')

/**
 * The cart's and the checkout's reminder: the order this browser placed
 * that still waits for its online payment (`useAwaitingPaymentOrder`), read
 * again from Django on mount. An order Django no longer offers a link for,
 * or that is gone, is forgotten; a failed read keeps it for the next page.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const NOW = new Date('2026-11-20T10:00:00Z')
const UUID = '00000000-0000-4006-8000-000000000042'
const ORDER_URL = `/api/orders/uuid/${UUID}`
const KEY = 'order-awaiting-payment'
const UNTIL = '2026-11-20T10:30:00.000Z'

function waiting(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return makeOrder({
    id: 42,
    uuid: UUID,
    amountDue: 25,
    isOnlinePayment: true,
    isCollectedOnDelivery: false,
    paymentHoldExpiresAt: UNTIL,
    ...overrides,
  })
}

describe('OrderAwaitingPaymentReminder', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const mount = async () => {
    const wrapper = await mountSuspended(OrderAwaitingPaymentReminder, { route: false })
    await flushPromises()
    return wrapper
  }

  it('asks nothing when this browser placed no such order', async () => {
    const wrapper = await mount()

    expect(api.callsTo(ORDER_URL)).toEqual([])
    expect(wrapper.text()).toBe('')
  })

  it('reminds of the order while Django offers it a link', async () => {
    rememberAwaitingPaymentOrder(UUID, UNTIL)
    api.routes({ [ORDER_URL]: waiting() })

    const wrapper = await mount()

    expect(wrapper.text()).toContain(texts.t('reminder.title', { id: 42 }))
    expect(readAwaitingPaymentOrder()).toBe(UUID)
  })

  it('drops an order past its deadline without asking Django', async () => {
    rememberAwaitingPaymentOrder(UUID, UNTIL)
    vi.setSystemTime(new Date(UNTIL))

    const wrapper = await mount()

    expect(api.callsTo(ORDER_URL)).toEqual([])
    expect(wrapper.text()).toBe('')
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('follows a deadline a later link moved', async () => {
    rememberAwaitingPaymentOrder(UUID, UNTIL)
    api.routes({ [ORDER_URL]: waiting({ paymentHoldExpiresAt: '2026-11-20T10:50:00.000Z' }) })

    await mount()
    vi.setSystemTime(new Date('2026-11-20T10:40:00Z'))

    expect(readAwaitingPaymentOrder()).toBe(UUID)
  })

  it('leaves a newer deadline, kept while its read was on its way, as it is', async () => {
    rememberAwaitingPaymentOrder(UUID, UNTIL)
    api.routes({
      [ORDER_URL]: () => {
        // Another tab opens a new link before this read answers.
        rememberAwaitingPaymentOrder(UUID, '2026-11-20T10:50:00.000Z')
        return waiting()
      },
    })

    await mount()
    vi.setSystemTime(new Date('2026-11-20T10:40:00Z'))

    expect(readAwaitingPaymentOrder()).toBe(UUID)
  })

  it.each([
    { case: 'is paid', answer: () => waiting({ paymentHoldExpiresAt: null, isPaid: true, paymentStatus: 'COMPLETED' }) },
    { case: 'is gone', answer: failWith(404) },
    { case: 'no longer opens for this browser', answer: failWith(403) },
  ])('forgets an order that $case', async ({ answer }) => {
    rememberAwaitingPaymentOrder(UUID, UNTIL)
    api.routes({ [ORDER_URL]: answer })

    const wrapper = await mount()

    expect(wrapper.text()).toBe('')
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it.each([
    { case: 'a payment the provider is processing', state: { paymentStatus: 'PROCESSING' as const } },
    { case: 'a charge the store reviews', state: { paymentAwaitsReview: true } },
  ])('keeps, without showing, an order held up by $case', async ({ state }) => {
    rememberAwaitingPaymentOrder(UUID, UNTIL)
    api.routes({ [ORDER_URL]: waiting(state) })

    const wrapper = await mount()

    expect(wrapper.text()).toBe('')
    expect(readAwaitingPaymentOrder()).toBe(UUID)
  })

  it('keeps the order for the next page when the read fails', async () => {
    rememberAwaitingPaymentOrder(UUID, UNTIL)
    api.routes({ [ORDER_URL]: failWith(502) })

    const wrapper = await mount()

    expect(wrapper.text()).toBe('')
    expect(readAwaitingPaymentOrder()).toBe(UUID)
  })
})
