import { describe, expect, it } from 'vitest'
import { payWayDisplayCost, payWayFeeBase } from '~/utils/payWayCost'
import { makePayWay } from '~~/test/fixtures/payWay'

/**
 * The fee the checkout shows next to a pay way. It must agree with
 * Django's ``OrderService.calculate_payment_method_fee``: waived once
 * items + shipping reach the threshold, charged in full otherwise.
 */
describe('payWayDisplayCost', () => {
  it.each([
    // [case, cost, freeThreshold, feeBase, expected]
    ['a free pay way', 0, 0, 20, { cost: 0, freeAbove: null }],
    ['a fee with no threshold', 2.5, 0, 1000, { cost: 2.5, freeAbove: null }],
    ['a fee below the threshold', 2.5, 50, 49.99, { cost: 2.5, freeAbove: 50 }],
    ['a fee exactly at the threshold', 2.5, 50, 50, { cost: 0, freeAbove: null }],
    ['a fee above the threshold', 2.5, 50, 80, { cost: 0, freeAbove: null }],
    ['a free pay way with a threshold', 0, 50, 10, { cost: 0, freeAbove: null }],
  ])('%s', (_case, cost, freeThreshold, feeBase, expected) => {
    expect(payWayDisplayCost(makePayWay({ cost, freeThreshold }), feeBase)).toEqual(expected)
  })
})

describe('payWayFeeBase', () => {
  it.each([
    // [case, totalPrice, promotionDiscount, shipping, expected]
    ['the items plus the delivery', 40, 0, 3, 43],
    ['the items after promotions plus the delivery', 60, 15, 3, 48],
    ['no delivery under a free-shipping promotion', 60, 12, 0, 48],
    ['never below zero', 10, 20, 0, 0],
  ])('%s', (_case, totalPrice, promotionDiscount, shipping, expected) => {
    expect(payWayFeeBase({ totalPrice, promotionDiscount, shipping })).toBe(expected)
  })
})
