import { describe, it, expect } from 'vitest'
import { giftCardAmountBound } from '~/utils/giftCardAmount'

describe('giftCardAmountBound', () => {
  it.each([
    ['10.00', 10],
    ['500.00', 500],
    ['12.5', 12.5],
  ])('reads %s as %d', (amount, expected) => {
    expect(giftCardAmountBound(amount)).toBe(expected)
  })

  it.each(['', '  ', '0', '-5', 'abc'])('leaves %j to Django', (amount) => {
    expect(giftCardAmountBound(amount)).toBeNull()
  })
})
