import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
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

  it('is the account page for the signed-in owner', () => {
    expect(orderPageLocation(order, true)).toEqual({ name: 'account-orders-id', params: { id: '42' } })
  })

  it.each([
    { case: 'a signed-out reader', o: order, signedIn: false },
    { case: 'a guest order', o: makeOrder({ id: 42, user: null }), signedIn: true },
  ])('is the confirmation by uuid for $case', ({ o, signedIn }) => {
    expect(orderPageLocation(o, signedIn)).toEqual({ name: 'checkout-success-uuid', params: { uuid: o.uuid } })
  })
})

describe('the order awaiting payment in this browser', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value) },
      removeItem: (key: string) => { store.delete(key) },
    })
  })

  it('keeps the latest order placed', () => {
    rememberAwaitingPaymentOrder('first')
    rememberAwaitingPaymentOrder('second')

    expect(readAwaitingPaymentOrder()).toBe('second')
  })

  it('forgets an order, but not a newer one that took its place', () => {
    rememberAwaitingPaymentOrder('second')
    forgetAwaitingPaymentOrder('first')
    expect(readAwaitingPaymentOrder()).toBe('second')

    forgetAwaitingPaymentOrder('second')
    expect(readAwaitingPaymentOrder()).toBeNull()
  })
})
