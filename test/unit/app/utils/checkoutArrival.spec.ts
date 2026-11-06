import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isPurchaseReported, markPurchaseReported, readCheckoutArrival, writeCheckoutArrival } from '../../../../app/utils/checkoutArrival'

const store = new Map<string, string>()
const browserStorage = (prefix: string) => ({
  getItem: (key: string) => store.get(prefix + key) ?? null,
  setItem: (key: string, value: string) => void store.set(prefix + key, value),
})

beforeEach(() => {
  store.clear()
  vi.stubGlobal('sessionStorage', browserStorage('session:'))
  vi.stubGlobal('localStorage', browserStorage('local:'))
})

describe('the checkout arrival', () => {
  it('reads back what was written', () => {
    const arrival = { orderUuid: 'u', sessionId: 's', vivaOrderCode: 'v', placed: true }

    writeCheckoutArrival(arrival)

    expect(readCheckoutArrival()).toEqual(arrival)
  })

  it('finds none in a tab that has none', () => {
    expect(readCheckoutArrival()).toBeUndefined()
  })

  it.each([
    ['broken JSON', '{'],
    ['null', 'null'],
    ['an empty order id', '{"orderUuid":""}'],
    ['no order id', '{"placed":true}'],
  ])('finds none in %s', (_label, stored) => {
    store.set('session:checkout-arrival', stored)

    expect(readCheckoutArrival()).toBeUndefined()
  })

  it('remembers a reported purchase per order', () => {
    expect(isPurchaseReported('u')).toBe(false)

    markPurchaseReported('u')

    expect(isPurchaseReported('u')).toBe(true)
    expect(isPurchaseReported('another')).toBe(false)
  })

  it('keeps that apart from the arrival, which an older link overwrites', () => {
    markPurchaseReported('u')

    writeCheckoutArrival({ orderUuid: 'u', placed: true })

    expect(isPurchaseReported('u')).toBe(true)
  })
})
