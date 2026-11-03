import { describe, it, expect } from 'vitest'
import { giftCardAmountBound } from '~/utils/giftCardAmount'

describe('giftCardAmountBound', () => {
  it.each([10, 500, 12.5])('keeps %d as it is', (amount) => {
    expect(giftCardAmountBound(amount)).toBe(amount)
  })

  it.each([undefined, 0, -5])('leaves %j to Django', (amount) => {
    expect(giftCardAmountBound(amount)).toBeNull()
  })
})
