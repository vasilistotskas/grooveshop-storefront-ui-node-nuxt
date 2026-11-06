import { describe, it, expect, beforeEach, vi } from 'vitest'
import { markPurchaseReported, readCheckoutArrival, writeCheckoutArrival } from '../../../../app/utils/checkoutArrival'

const store = new Map<string, string>()

beforeEach(() => {
  store.clear()
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  })
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
    store.set('checkout-arrival', stored)

    expect(readCheckoutArrival()).toBeUndefined()
  })

  it('remembers that the purchase was reported, for a reload', () => {
    writeCheckoutArrival({ orderUuid: 'u', placed: true })

    markPurchaseReported()

    expect(readCheckoutArrival()).toEqual({ orderUuid: 'u', placed: true, purchaseReported: true })
  })

  it('has nothing to mark without an arrival', () => {
    markPurchaseReported()

    expect(readCheckoutArrival()).toBeUndefined()
  })
})
