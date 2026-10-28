import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import type { Component } from 'vue'
import { getQuery } from 'h3'
import OrderDetailPage from '~/components/Storefront/Account/OrderDetail.vue'
import WebsideOrderDetailPage from '~/components/variants/webside/Storefront/Account/OrderDetail.vue'
import { makeAcsShipment, makeAcsStation, makeAcsTrackingEvent } from '~~/test/fixtures/acs'
import { makeBoxNowLocker, makeBoxNowParcelEvent, makeBoxNowShipment } from '~~/test/fixtures/boxnow'
import { makeOrder, makeOrderItem } from '~~/test/fixtures/order'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'
import { failWith } from '~~/test/helpers/api'
import { inlineCopy } from '~~/test/helpers/inlineCopy'
import { trees } from '~~/test/helpers/trees'

/**
 * One order: its progress, one timeline of the store's steps and the
 * carrier's scans (newest first), where it is going, its items and
 * totals, the payment, and the order's own actions — the invoice, buy
 * again, and cancel behind a confirmation. The webside page draws
 * it its own way (a stepper, collapsible sections) and shares the request,
 * the invoice and buy again with the shop's: only those run on both trees.
 */
const state = vi.hoisted(() => ({ order: null as unknown }))
const { cancelOrder, reorder, useReorderMock, toastAdd } = vi.hoisted(() => {
  const reorder = vi.fn((_id: number) => Promise.resolve())
  return {
    cancelOrder: vi.fn((_id: number) => Promise.resolve({})),
    reorder,
    useReorderMock: vi.fn((_options?: unknown) => ({ reorder, reordering: ref(null) })),
    toastAdd: vi.fn(),
  }
})
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())

mockNuxtImport('$api', () => api)
mockNuxtImport('useRoute', () => () => ({ name: 'account-orders-id___el', params: { id: '3' }, query: {}, path: '/account/orders/3', fullPath: '/account/orders/3', hash: '', meta: {}, matched: [] }))
mockNuxtImport('useOrder', () => () => ({ cancelOrder }))
mockNuxtImport('useReorder', () => useReorderMock)
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

let fetches = 0
let asked: Record<string, unknown> = {}

beforeEach(() => {
  fetches = 0
  asked = {}
  setTenant({ loyaltyEnabled: true })
  setTenantFeatures({ loyalty: true })
  state.order = makeOrder({ id: 3 })
  clearNuxtData('order3')
  registerEndpoint('/api/orders/3', (event) => {
    fetches++
    asked = getQuery(event)
    return state.order
  })
})

async function mountPage(C: Component = OrderDetailPage) {
  const wrapper = await mountSuspended(C)
  await flushPromises()
  return wrapper
}

const timelineTitles = (wrapper: VueWrapper) =>
  wrapper.findAll('section ol').at(-1)!.findAll('li').map(entry => entry.get('p').text())
const button = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('button, a').find(control => control.text() === label)

describe.each(trees(OrderDetailPage, WebsideOrderDetailPage))('$tree Storefront/Account/OrderDetail', ({ tree, C }) => {
  const defaultOnly = tree === 'default'
  const reorderLabel = () => defaultOnly
    ? 'Αγόρασέ τα ξανά'
    : inlineCopy('app/components/variants/webside/Storefront/Account/OrderDetail.vue').reorder.cta

  it('reads the order once, in the page\'s language', async () => {
    await mountPage(C)

    expect(fetches).toBe(1)
    expect(asked).toEqual({ languageCode: 'el' })
  })

  it('heads the page with the order number', async () => {
    const wrapper = await mountPage(C)

    expect(wrapper.get('h1').text()).toContain('#3')
  })

  it.each([{ cart: true, offered: true }, { cart: false, offered: false }])('offers "Buy again": $offered when the cart is $cart', async ({ cart, offered }) => {
    setTenantFeatures({ cart })
    const wrapper = await mountPage(C)

    expect(button(wrapper, reorderLabel()) !== undefined).toBe(offered)
  })

  it.runIf(!defaultOnly)('buys the order again with the webside page\'s own words and toast icons', async () => {
    const wrapper = await mountPage(C)

    await button(wrapper, reorderLabel())!.trigger('click')

    expect(reorder).toHaveBeenCalledWith(3)
    expect(useReorderMock).toHaveBeenCalledWith({
      t: expect.any(Function),
      icons: { empty: 'i-heroicons-exclamation-triangle', success: 'i-heroicons-shopping-cart' },
    })
  })

  it.runIf(defaultOnly).each([
    { name: 'the order earns points', points: 120, feature: true, shown: true },
    { name: 'the order earns nothing', points: 0, feature: true, shown: false },
    { name: 'the store lacks the loyalty feature, plan flag on', points: 120, feature: false, shown: false },
  ])('says what the order will earn only when it can: $name', async ({ points, feature, shown }) => {
    setTenantFeatures({ loyalty: feature })
    state.order = makeOrder({ id: 3, loyaltyPointsToEarn: points })

    const wrapper = await mountPage(C)

    expect(wrapper.text().includes('Θα κερδίσεις 120 πόντους')).toBe(shown)
  })

  it.runIf(defaultOnly)('heads the page with the order number and when it was placed', async () => {
    state.order = makeOrder({ id: 3, createdAt: '2026-10-01T07:25:00.000Z' })

    const wrapper = await mountPage(C)

    expect(wrapper.get('h1').text()).toBe('Παραγγελία #3')
    expect(wrapper.findAll('header time').map(time => time.attributes('datetime'))).toEqual(['2026-10-01T07:25:00.000Z', '2026-10-01T07:25:00.000Z'])
  })

  it.runIf(defaultOnly)('merges the store\'s steps with the carrier\'s scans, newest first', async () => {
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

    const wrapper = await mountPage(C)

    expect(timelineTitles(wrapper)).toEqual([
      useBoxNowParcelState().presentationFor('in_depot').label,
      'Πληρωμή',
      'Η παραγγελία καταχωρήθηκε',
    ])
  })

  it.runIf(defaultOnly)('shows the BOX NOW locker, links its tracking and offers the label', async () => {
    state.order = makeOrder({
      id: 3,
      boxnowShipment: makeBoxNowShipment({ parcelId: '9812447102', locker: makeBoxNowLocker({ name: 'Τσιμισκή 45', addressLine1: 'Τσιμισκή 45', postalCode: '54623' }) }),
    })

    const wrapper = await mountPage(C)

    expect(wrapper.text()).toContain('Σημείο παραλαβής')
    expect(wrapper.text()).toContain('BOX NOW · Τσιμισκή 45')
    expect(button(wrapper, 'Παρακολούθηση στο BOX NOW')?.attributes('href')).toBe('https://boxnow.gr/en?track=9812447102')
    expect(button(wrapper, 'Ετικέτα αποστολής')?.attributes('href')).toBe('/api/orders/3/boxnow-label')
  })

  it.runIf(defaultOnly)('shows the ACS station with its scans and links its tracking', async () => {
    state.order = makeOrder({
      id: 3,
      acsShipment: makeAcsShipment({
        voucherNo: '7200123456',
        station: makeAcsStation({ name: 'ACS Καλαμαριά' }),
        events: [makeAcsTrackingEvent({ checkpointAction: 'ΣΕ ΔΙΑΚΙΝΗΣΗ', eventTime: '2026-10-02T09:00:00Z' })],
      }),
    })

    const wrapper = await mountPage(C)

    expect(wrapper.text()).toContain('ACS · ACS Καλαμαριά')
    expect(timelineTitles(wrapper)).toEqual(['ΣΕ ΔΙΑΚΙΝΗΣΗ'])
    expect(button(wrapper, 'Παρακολούθηση στο ACS')?.attributes('href')).toBe('https://webapp.acscourier.net/track-shipment/7200123456')
  })

  it.runIf(defaultOnly)('opens the timeline with the estimated delivery while the order is on its way', async () => {
    state.order = makeOrder({
      id: 3,
      status: 'SHIPPED',
      trackingDetails: { estimatedDelivery: '2026-10-08' },
      orderTimeline: [{ changeType: 'CREATED', timestamp: '2026-10-01T10:00:00Z', description: '' }],
    })

    const wrapper = await mountPage(C)

    const first = wrapper.findAll('section ol').at(-1)!.findAll('li')[0]!
    expect(first.get('p').text()).toBe('Εκτιμώμενη παράδοση')
    expect(first.get('time').attributes('datetime')).toBe('2026-10-08T00:00:00.000Z')
  })

  it.runIf(defaultOnly)('names the pickup, not the delivery, when the parcel goes to a locker', async () => {
    state.order = makeOrder({
      id: 3,
      status: 'SHIPPED',
      trackingDetails: { estimatedDelivery: '2026-10-08' },
      boxnowShipment: makeBoxNowShipment({ locker: makeBoxNowLocker() }),
    })

    const wrapper = await mountPage(C)

    expect(timelineTitles(wrapper)[0]).toBe('Εκτιμώμενη ετοιμότητα για παραλαβή')
  })

  it.runIf(defaultOnly).each(['DELIVERED', 'CANCELED'] as const)('shows no estimate once the order is %s', async (status) => {
    state.order = makeOrder({ id: 3, status, trackingDetails: { estimatedDelivery: '2026-10-08' } })

    const wrapper = await mountPage(C)

    expect(wrapper.text()).not.toContain('Εκτιμώμενη')
  })

  it.runIf(defaultOnly)('shows the delivery address, and no tracking, before anything has shipped', async () => {
    const wrapper = await mountPage(C)

    expect(wrapper.text()).toContain('Διεύθυνση αποστολής')
    expect(wrapper.text()).toContain('Ερμού 12, 10563 Αθήνα')
    expect(wrapper.text()).not.toContain('Παρακολούθηση')
  })

  it.runIf(defaultOnly)('lists the items and adds the totals up the order\'s way', async () => {
    state.order = makeOrder({
      id: 3,
      items: [makeOrderItem({ id: 1, quantity: 2, totalPrice: 43.16 })],
      isPaid: true,
      pricingBreakdown: { itemsSubtotal: 112.56, discount: 10, loyaltyDiscount: 4.9, giftCardAmount: 20, shippingCost: 0, grandTotal: 77.66 },
    })
    const { n } = useNuxtApp().$i18n

    const wrapper = await mountPage(C)
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

  it.runIf(defaultOnly)('cancels only after the shopper confirms, then shows the order as it now is', async () => {
    const wrapper = await mountPage(C)

    await button(wrapper, 'Ακύρωση παραγγελίας')!.trigger('click')
    await flushPromises()
    expect(cancelOrder).not.toHaveBeenCalled()

    const confirm = [...document.body.querySelectorAll('button')].find(control => control.textContent?.trim() === 'Ναι, ακύρωσέ τη')!
    confirm.click()
    await flushPromises()

    expect(cancelOrder).toHaveBeenCalledWith(3)
    expect(fetches).toBe(2)
  })

  it.runIf(defaultOnly)('says the parcel is with the courier when Django refuses the cancel for that', async () => {
    cancelOrder.mockRejectedValueOnce(Object.assign(new Error('Bad Request'), {
      statusCode: 400,
      data: { detail: 'refused', error: { type: 'parcel_with_courier' } },
    }))
    const wrapper = await mountPage(C)

    await button(wrapper, 'Ακύρωση παραγγελίας')!.trigger('click')
    await flushPromises()
    const confirm = [...document.body.querySelectorAll('button')].find(control => control.textContent?.trim() === 'Ναι, ακύρωσέ τη')!
    confirm.click()
    await flushPromises()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      color: 'error',
      description: expect.stringContaining('εταιρεία μεταφορών'),
    }))
  })

  it.runIf(defaultOnly).each([
    {
      name: 'the courier gives no answer',
      statusCode: 503,
      data: { detail: 'unreachable', error: { type: 'courier_unreachable' } },
      says: 'σε λίγα λεπτά',
    },
    { name: 'anything else fails', statusCode: 500, data: undefined, says: 'Κάτι πήγε στραβά' },
  ])('asks to try again, and keeps the order as it was, when $name', async ({ statusCode, data, says }) => {
    cancelOrder.mockRejectedValueOnce(Object.assign(new Error('failed'), { statusCode, data }))
    const wrapper = await mountPage(C)

    await button(wrapper, 'Ακύρωση παραγγελίας')!.trigger('click')
    await flushPromises()
    const confirm = [...document.body.querySelectorAll('button')].find(control => control.textContent?.trim() === 'Ναι, ακύρωσέ τη')!
    confirm.click()
    await flushPromises()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      color: 'error',
      description: expect.stringContaining(says),
    }))
    expect(fetches).toBe(1)
  })

  it.runIf(defaultOnly)('offers no cancel once the order cannot be canceled', async () => {
    state.order = makeOrder({ id: 3, canBeCanceled: false })

    expect(button(await mountPage(C), 'Ακύρωση παραγγελίας')).toBeUndefined()
  })

  it.runIf(defaultOnly)('says a canceled order was canceled, and why', async () => {
    state.order = makeOrder({ id: 3, status: 'CANCELED', canBeCanceled: false, cancellation: { reason: 'Εκτός αποθέματος' } })

    const wrapper = await mountPage(C)

    expect(wrapper.text()).toContain('Η παραγγελία ακυρώθηκε')
    expect(wrapper.text()).toContain('Εκτός αποθέματος')
  })

  /** A tab as `window.open` hands it back, with what the page does to it recorded. */
  function fakeTab() {
    return { opener: {} as unknown, location: { href: '' }, close: vi.fn() }
  }

  it.runIf(defaultOnly)('opens the invoice tab on the click itself, then points it at the signed link', async () => {
    state.order = makeOrder({ id: 3, hasInvoice: true })
    api.routes({ '/api/orders/3/invoice': { downloadUrl: 'https://cdn.example/invoice.pdf' } })
    const tab = fakeTab()
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)

    const wrapper = await mountPage(C)
    await button(wrapper, 'Απόδειξη')!.trigger('click')
    // Opened before the request answers: Safari blocks a tab opened later.
    expect(open).toHaveBeenCalledWith('', '_blank')
    await flushPromises()

    expect(tab.opener).toBeNull()
    expect(tab.location.href).toBe('https://cdn.example/invoice.pdf')
  })

  it.runIf(defaultOnly)('closes the invoice tab again when there is no invoice to show', async () => {
    state.order = makeOrder({ id: 3, hasInvoice: true })
    api.routes({ '/api/orders/3/invoice': {} })
    const tab = fakeTab()
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)

    const wrapper = await mountPage(C)
    await button(wrapper, 'Απόδειξη')!.trigger('click')
    await flushPromises()

    expect(tab.close).toHaveBeenCalled()
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
  })

  it.runIf(defaultOnly)('says the reason Django gives when the invoice cannot be had, and closes the tab', async () => {
    state.order = makeOrder({ id: 3, hasInvoice: true })
    api.routes({ '/api/orders/3/invoice': failWith(409, { detail: 'Το παραστατικό εκδίδεται ακόμη.' }) })
    const tab = fakeTab()
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)

    const wrapper = await mountPage(C)
    await button(wrapper, 'Απόδειξη')!.trigger('click')
    await flushPromises()

    expect(tab.close).toHaveBeenCalled()
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      color: 'error',
      description: expect.stringContaining('Το παραστατικό εκδίδεται ακόμη.'),
    }))
  })

  it.runIf(defaultOnly)('offers no invoice before one exists', async () => {
    expect(button(await mountPage(C), 'Απόδειξη')).toBeUndefined()
  })

  it.runIf(defaultOnly)('buys the order again', async () => {
    const wrapper = await mountPage(C)

    await button(wrapper, 'Αγόρασέ τα ξανά')!.trigger('click')

    expect(reorder).toHaveBeenCalledWith(3)
  })
})
