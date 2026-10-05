import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { computed, ref } from 'vue'
import OrderDetailPage from '~/components/Storefront/Account/OrderDetail.vue'
import { makeAcsShipment, makeAcsStation, makeAcsTrackingEvent } from '~~/test/fixtures/acs'
import { makeBoxNowLocker, makeBoxNowParcelEvent, makeBoxNowShipment } from '~~/test/fixtures/boxnow'
import { makeOrder, makeOrderItem } from '~~/test/fixtures/order'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * One order: its progress, one timeline of the store's steps and the
 * carrier's scans (newest first), where it is going, its items and
 * totals, the payment, and the order's own actions — the invoice, buy
 * again, and cancel behind a confirmation.
 */
const state = vi.hoisted(() => ({ order: null as unknown, loyaltyOn: true }))
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
mockNuxtImport('useSettingFlag', () => (key: string) => computed(() => key === 'LOYALTY_ENABLED' && state.loyaltyOn))

let fetches = 0

beforeEach(() => {
  fetches = 0
  state.loyaltyOn = true
  setTenant({ loyaltyEnabled: true })
  state.order = makeOrder({ id: 3 })
  clearNuxtData('order3')
  registerEndpoint('/api/orders/3', () => {
    fetches++
    return state.order
  })
})

async function mountPage() {
  const wrapper = await mountSuspended(OrderDetailPage)
  await flushPromises()
  return wrapper
}

const timelineTitles = (wrapper: VueWrapper) =>
  wrapper.findAll('section ol').at(-1)!.findAll('li').map(entry => entry.get('p').text())
const button = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('button, a').find(control => control.text() === label)

describe('Storefront/Account/OrderDetail', () => {
  it.each([
    { name: 'the order earns points', points: 120, tenant: true, runtime: true, shown: true },
    { name: 'the order earns nothing', points: 0, tenant: true, runtime: true, shown: false },
    { name: 'the plan lacks loyalty', points: 120, tenant: false, runtime: true, shown: false },
    { name: 'the loyalty setting is off', points: 120, tenant: true, runtime: false, shown: false },
  ])('says what the order will earn only when it can: $name', async ({ points, tenant, runtime, shown }) => {
    setTenant({ loyaltyEnabled: tenant })
    state.loyaltyOn = runtime
    state.order = makeOrder({ id: 3, loyaltyPointsToEarn: points })

    const wrapper = await mountPage()

    expect(wrapper.text().includes('Θα κερδίσεις 120 πόντους')).toBe(shown)
  })

  it('heads the page with the order number and when it was placed', async () => {
    state.order = makeOrder({ id: 3, createdAt: '2026-10-01T07:25:00.000Z' })

    const wrapper = await mountPage()

    expect(wrapper.get('h1').text()).toBe('Παραγγελία #3')
    expect(wrapper.findAll('header time').map(time => time.attributes('datetime'))).toEqual(['2026-10-01T07:25:00.000Z', '2026-10-01T07:25:00.000Z'])
  })

  it('merges the store\'s steps with the carrier\'s scans, newest first', async () => {
    state.order = makeOrder({
      id: 3,
      orderTimeline: [
        { changeType: 'CREATED', timestamp: '2026-10-01T10:00:00Z', description: '' },
        { changeType: 'PAYMENT', timestamp: '2026-10-01T10:01:00Z', description: 'Viva Wallet' },
      ],
      boxnowShipment: makeBoxNowShipment({
        events: [makeBoxNowParcelEvent({ eventType: 'in_depot', eventTime: '2026-10-02T08:00:00Z', displayName: 'Θεσσαλονίκη' })],
      }),
    })

    const wrapper = await mountPage()

    expect(timelineTitles(wrapper)).toEqual([
      useBoxNowParcelState().presentationFor('in_depot').label,
      'Πληρωμή',
      'Η παραγγελία καταχωρήθηκε',
    ])
  })

  it('shows the BOX NOW locker, links its tracking and offers the label', async () => {
    state.order = makeOrder({
      id: 3,
      boxnowShipment: makeBoxNowShipment({ parcelId: '9812447102', locker: makeBoxNowLocker({ name: 'Τσιμισκή 45', addressLine1: 'Τσιμισκή 45', postalCode: '54623' }) }),
    })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Σημείο παραλαβής')
    expect(wrapper.text()).toContain('BOX NOW · Τσιμισκή 45')
    expect(button(wrapper, 'Παρακολούθηση στο BOX NOW')?.attributes('href')).toBe('https://boxnow.gr/en?track=9812447102')
    expect(button(wrapper, 'Ετικέτα αποστολής')?.attributes('href')).toBe('/api/orders/3/boxnow-label')
  })

  it('shows the ACS station with its scans and links its tracking', async () => {
    state.order = makeOrder({
      id: 3,
      acsShipment: makeAcsShipment({
        voucherNo: '7200123456',
        station: makeAcsStation({ name: 'ACS Καλαμαριά' }),
        events: [makeAcsTrackingEvent({ checkpointAction: 'ΣΕ ΔΙΑΚΙΝΗΣΗ', eventTime: '2026-10-02T09:00:00Z' })],
      }),
    })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('ACS · ACS Καλαμαριά')
    expect(timelineTitles(wrapper)).toEqual(['ΣΕ ΔΙΑΚΙΝΗΣΗ'])
    expect(button(wrapper, 'Παρακολούθηση στο ACS')?.attributes('href')).toBe('https://webapp.acscourier.net/track-shipment/7200123456')
  })

  it('opens the timeline with the estimated delivery while the order is on its way', async () => {
    state.order = makeOrder({
      id: 3,
      status: 'SHIPPED',
      trackingDetails: { estimatedDelivery: '2026-10-08' },
      orderTimeline: [{ changeType: 'CREATED', timestamp: '2026-10-01T10:00:00Z', description: '' }],
    })

    const wrapper = await mountPage()

    const first = wrapper.findAll('section ol').at(-1)!.findAll('li')[0]!
    expect(first.get('p').text()).toBe('Εκτιμώμενη παράδοση')
    expect(first.get('time').attributes('datetime')).toBe('2026-10-08T00:00:00.000Z')
  })

  it('names the pickup, not the delivery, when the parcel goes to a locker', async () => {
    state.order = makeOrder({
      id: 3,
      status: 'SHIPPED',
      trackingDetails: { estimatedDelivery: '2026-10-08' },
      boxnowShipment: makeBoxNowShipment({ locker: makeBoxNowLocker() }),
    })

    const wrapper = await mountPage()

    expect(timelineTitles(wrapper)[0]).toBe('Εκτιμώμενη ετοιμότητα για παραλαβή')
  })

  it.each(['DELIVERED', 'CANCELED'] as const)('shows no estimate once the order is %s', async (status) => {
    state.order = makeOrder({ id: 3, status, trackingDetails: { estimatedDelivery: '2026-10-08' } })

    const wrapper = await mountPage()

    expect(wrapper.text()).not.toContain('Εκτιμώμενη')
  })

  it('shows the delivery address, and no tracking, before anything has shipped', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Διεύθυνση αποστολής')
    expect(wrapper.text()).toContain('Ερμού 12, 10563 Αθήνα')
    expect(wrapper.text()).not.toContain('Παρακολούθηση')
  })

  it('lists the items and adds the totals up the order\'s way', async () => {
    state.order = makeOrder({
      id: 3,
      items: [makeOrderItem({ id: 1, quantity: 2, totalPrice: 43.16 })],
      isPaid: true,
      pricingBreakdown: { itemsSubtotal: 112.56, discount: 10, loyaltyDiscount: 4.9, giftCardAmount: 20, shippingCost: 0, grandTotal: 77.66 },
    })
    const { n } = useNuxtApp().$i18n

    const wrapper = await mountPage()
    const totals = wrapper.findAll('dl > div').map(row => [row.get('dt').text(), row.get('dd').text()])

    expect(wrapper.text()).toContain('Ποσ. 2')
    expect(totals).toEqual([
      ['Υποσύνολο', n(112.56, 'currency')],
      ['Εκπτώσεις', `−${n(14.9, 'currency')}`],
      // A gift card pays part of the order: its own line, not a discount.
      ['Δωροκάρτα', `−${n(20, 'currency')}`],
      ['Μεταφορικά', 'Δωρεάν'],
      ['Πληρώθηκαν', n(77.66, 'currency')],
    ])
  })

  it('cancels only after the shopper confirms, then shows the order as it now is', async () => {
    const wrapper = await mountPage()

    await button(wrapper, 'Ακύρωση παραγγελίας')!.trigger('click')
    await flushPromises()
    expect(cancelOrder).not.toHaveBeenCalled()

    const confirm = [...document.body.querySelectorAll('button')].find(control => control.textContent?.trim() === 'Ναι, ακύρωσέ τη')!
    confirm.click()
    await flushPromises()

    expect(cancelOrder).toHaveBeenCalledWith(3)
    expect(fetches).toBe(2)
  })

  it('offers no cancel once the order cannot be canceled', async () => {
    state.order = makeOrder({ id: 3, canBeCanceled: false })

    expect(button(await mountPage(), 'Ακύρωση παραγγελίας')).toBeUndefined()
  })

  it('says a canceled order was canceled, and why', async () => {
    state.order = makeOrder({ id: 3, status: 'CANCELED', canBeCanceled: false, cancellation: { reason: 'Εκτός αποθέματος' } })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Η παραγγελία ακυρώθηκε')
    expect(wrapper.text()).toContain('Εκτός αποθέματος')
  })

  /** A tab as `window.open` hands it back, with what the page does to it recorded. */
  function fakeTab() {
    return { opener: {} as unknown, location: { href: '' }, close: vi.fn() }
  }

  it('opens the invoice tab on the click itself, then points it at the signed link', async () => {
    state.order = makeOrder({ id: 3, hasInvoice: true })
    api.routes({ '/api/orders/3/invoice': { downloadUrl: 'https://cdn.example/invoice.pdf' } })
    const tab = fakeTab()
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)

    const wrapper = await mountPage()
    await button(wrapper, 'Τιμολόγιο')!.trigger('click')
    // Opened before the request answers: Safari blocks a tab opened later.
    expect(open).toHaveBeenCalledWith('', '_blank')
    await flushPromises()

    expect(tab.opener).toBeNull()
    expect(tab.location.href).toBe('https://cdn.example/invoice.pdf')
  })

  it('closes the invoice tab again when there is no invoice to show', async () => {
    state.order = makeOrder({ id: 3, hasInvoice: true })
    api.routes({ '/api/orders/3/invoice': {} })
    const tab = fakeTab()
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)

    const wrapper = await mountPage()
    await button(wrapper, 'Τιμολόγιο')!.trigger('click')
    await flushPromises()

    expect(tab.close).toHaveBeenCalled()
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
  })

  it('offers no invoice before one exists', async () => {
    expect(button(await mountPage(), 'Τιμολόγιο')).toBeUndefined()
  })

  it('buys the order again', async () => {
    const wrapper = await mountPage()

    await button(wrapper, 'Αγόρασέ τα ξανά')!.trigger('click')

    expect(reorder).toHaveBeenCalledWith(3)
  })
})
