import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  extendAwaitingPaymentOrder,
  keptAwaitingPaymentOrder,
  updateAwaitingPaymentOrder,
  forgetAwaitingPaymentOrder,
  offersPaymentLink,
  orderPageLocation,
  readAwaitingPaymentOrder,
  rememberAwaitingPaymentOrder,
} from '~/utils/orderPayment'
import { makeOrder } from '~~/test/fixtures/order'

const HOLD = '2026-11-20T10:30:00.000Z'

describe('offersPaymentLink', () => {
  it.each([
    { case: 'an order waiting for its online payment', order: makeOrder({ paymentHoldExpiresAt: HOLD }), offered: true },
    { case: 'a failed payment still in its window', order: makeOrder({ paymentHoldExpiresAt: HOLD, paymentStatus: 'FAILED' }), offered: true },
    { case: 'an order with no hold (paid, closed, offline)', order: makeOrder({ paymentHoldExpiresAt: null }), offered: false },
    { case: 'a charge the store must review', order: makeOrder({ paymentHoldExpiresAt: HOLD, paymentAwaitsReview: true }), offered: false },
    { case: 'a payment the provider is processing', order: makeOrder({ paymentHoldExpiresAt: HOLD, paymentStatus: 'PROCESSING' }), offered: false },
  ])('is $offered for $case', ({ order, offered }) => {
    expect(offersPaymentLink(order)).toBe(offered)
  })
})

describe('orderPageLocation', () => {
  const order = makeOrder({ id: 42, user: 7 })

  it('is the account page for its owner, signed in', () => {
    expect(orderPageLocation(order, 7)).toEqual({ name: 'account-orders-id', params: { id: '42' } })
  })

  it.each([
    { case: 'a signed-out reader', o: order, readerId: undefined },
    { case: 'another signed-in shopper', o: order, readerId: 8 },
    { case: 'a guest order', o: makeOrder({ id: 42, user: null }), readerId: 7 },
  ])('is the confirmation by uuid for $case', ({ o, readerId }) => {
    expect(orderPageLocation(o, readerId)).toEqual({ name: 'checkout-success-uuid', params: { uuid: o.uuid } })
  })
})

describe('the order awaiting payment in this browser', () => {
  const NOW = new Date('2026-11-20T10:00:00Z')
  const UNTIL = '2026-11-20T10:30:00.000Z'
  let store: Map<string, string>

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value) },
      removeItem: (key: string) => { store.delete(key) },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps the uuid and the deadline, nothing else', () => {
    rememberAwaitingPaymentOrder('first', UNTIL)

    expect(JSON.parse(store.get('order-awaiting-payment')!)).toEqual({ uuid: 'first', until: UNTIL })
  })

  it('keeps the latest order placed', () => {
    rememberAwaitingPaymentOrder('first', UNTIL)
    rememberAwaitingPaymentOrder('second', UNTIL)

    expect(readAwaitingPaymentOrder()).toBe('second')
  })

  it('drops the order once its deadline has passed, unasked', () => {
    rememberAwaitingPaymentOrder('first', UNTIL)
    vi.setSystemTime(new Date(UNTIL))

    expect(readAwaitingPaymentOrder()).toBeNull()
    expect(store.size).toBe(0)
  })

  it('moves the deadline with a new link for the same order only', () => {
    rememberAwaitingPaymentOrder('first', UNTIL)
    extendAwaitingPaymentOrder('other', '2026-11-20T11:00:00.000Z')
    vi.setSystemTime(new Date(UNTIL))
    expect(readAwaitingPaymentOrder()).toBeNull()

    rememberAwaitingPaymentOrder('first', '2026-11-20T10:45:00.000Z')
    extendAwaitingPaymentOrder('first', '2026-11-20T11:00:00.000Z')
    vi.setSystemTime(new Date('2026-11-20T10:50:00Z'))
    expect(readAwaitingPaymentOrder()).toBe('first')
  })

  it('takes a read\'s deadline only while the kept order is still the one the read started from', () => {
    rememberAwaitingPaymentOrder('first', UNTIL)
    const seen = keptAwaitingPaymentOrder()!
    // A link opened in another tab while the read was on its way.
    extendAwaitingPaymentOrder('first', '2026-11-20T10:40:00.000Z')
    updateAwaitingPaymentOrder(seen, UNTIL)
    expect(keptAwaitingPaymentOrder()).toEqual({ uuid: 'first', until: '2026-11-20T10:40:00.000Z' })

    updateAwaitingPaymentOrder(keptAwaitingPaymentOrder()!, '2026-11-20T10:50:00.000Z')
    expect(keptAwaitingPaymentOrder()).toEqual({ uuid: 'first', until: '2026-11-20T10:50:00.000Z' })
  })

  it('keeps nothing, and holds nothing up, where storage cannot be used', () => {
    const refuse = () => {
      throw new Error('SecurityError')
    }
    vi.stubGlobal('localStorage', { getItem: refuse, setItem: refuse, removeItem: refuse })

    expect(() => rememberAwaitingPaymentOrder('first', UNTIL)).not.toThrow()
    expect(() => extendAwaitingPaymentOrder('first', UNTIL)).not.toThrow()
    expect(() => forgetAwaitingPaymentOrder('first')).not.toThrow()
    expect(readAwaitingPaymentOrder()).toBeNull()
  })

  describe('where storage reads but cannot remove', () => {
    const KEY = 'order-awaiting-payment'
    let removeItem: ReturnType<typeof vi.fn>

    beforeEach(() => {
      removeItem = vi.fn(() => {
        throw new Error('SecurityError')
      })
      vi.stubGlobal('localStorage', {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => { store.set(key, value) },
        removeItem,
      })
    })

    it('reads nothing past the deadline, though the drop fails', () => {
      store.set(KEY, JSON.stringify({ uuid: 'first', until: '2026-11-20T09:59:00.000Z' }))

      expect(keptAwaitingPaymentOrder()).toBeNull()
      expect(removeItem).toHaveBeenCalledExactlyOnceWith(KEY)
    })

    it('reads nothing it cannot parse, though the drop fails', () => {
      store.set(KEY, 'not json')

      expect(readAwaitingPaymentOrder()).toBeNull()
      expect(removeItem).toHaveBeenCalledExactlyOnceWith(KEY)
    })

    it('forgets nothing, and throws nothing, when the drop fails', () => {
      store.set(KEY, JSON.stringify({ uuid: 'first', until: UNTIL }))

      expect(() => forgetAwaitingPaymentOrder('first')).not.toThrow()
      expect(removeItem).toHaveBeenCalledExactlyOnceWith(KEY)
    })
  })

  it('drops what it cannot read', () => {
    store.set('order-awaiting-payment', 'not json')

    expect(readAwaitingPaymentOrder()).toBeNull()
    expect(store.size).toBe(0)
  })

  it('forgets an order, but not a newer one that took its place', () => {
    rememberAwaitingPaymentOrder('second', UNTIL)
    forgetAwaitingPaymentOrder('first')
    expect(readAwaitingPaymentOrder()).toBe('second')

    forgetAwaitingPaymentOrder('second')
    expect(readAwaitingPaymentOrder()).toBeNull()
  })
})
