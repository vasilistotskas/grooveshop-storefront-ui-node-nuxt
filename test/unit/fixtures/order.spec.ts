import { describe, expect, it } from 'vitest'

import { zOrder, zOrderDetail } from '~~/shared/openapi/zod.gen'
import { makeOrder, makeOrderListItem } from '~~/test/fixtures/order'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/**
 * Parsed strictly (an unknown key is a renamed field) so the next
 * schema change fails here, naming the field, rather than as a payment
 * spec passing against an order Django cannot send.
 */
describe('makeOrder', () => {
  it('builds a default order that parses through zOrderDetail', () => {
    expect(problems(zOrderDetail, makeOrder())).toEqual([])
  })

  it('derives the uuid from the id, so two orders never share one', () => {
    const [a, b] = [makeOrder({ id: 1 }), makeOrder({ id: 2 })]

    expect(problems(zOrderDetail, b)).toEqual([])
    expect(a.uuid).not.toBe(b.uuid)
  })

  it('parses as a paid online order', () => {
    const order = makeOrder({
      payWayKey: 'STRIPE',
      isOnlinePayment: true,
      isCollectedOnDelivery: false,
      paymentStatus: 'COMPLETED',
      isPaid: true,
      paidAmount: 42,
    })

    expect(problems(zOrderDetail, order)).toEqual([])
  })
})

describe('makeOrderListItem', () => {
  it('builds a default list row that parses through zOrder', () => {
    expect(problems(zOrder, makeOrderListItem())).toEqual([])
  })

  it('shares its uuid with the detail of the same order', () => {
    expect(makeOrderListItem({ id: 42 }).uuid).toBe(makeOrder({ id: 42 }).uuid)
  })

  it('parses as a shipped, paid, no-longer-cancellable order', () => {
    const order = makeOrderListItem({
      status: 'SHIPPED',
      statusDisplay: 'Απεστάλη',
      isPaid: true,
      paymentStatus: 'COMPLETED',
      canBeCanceled: false,
    })

    expect(problems(zOrder, order)).toEqual([])
  })
})
