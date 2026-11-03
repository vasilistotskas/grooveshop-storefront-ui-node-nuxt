import { describe, it, expect } from 'vitest'
import { giftCardValidityDays } from '~/utils/giftCardValidity'

describe('giftCardValidityDays', () => {
  it.each([1825, 365, 30, 1])('keeps %d days as %d days, never rounding to years or months', (days) => {
    expect(giftCardValidityDays(days)).toBe(days)
  })

  it.each([undefined, 0, -30])('says nothing for %j', (days) => {
    expect(giftCardValidityDays(days)).toBeNull()
  })
})
