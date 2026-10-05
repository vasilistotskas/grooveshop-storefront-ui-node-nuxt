import { describe, it, expect } from 'vitest'
import { giftCardValidityDays } from '~/utils/giftCardValidity'

describe('giftCardValidityDays', () => {
  it.each([
    ['1825', 1825],
    ['365', 365],
    ['30', 30],
    ['1', 1],
  ])('keeps %s days as %d days, never rounding to years or months', (days, expected) => {
    expect(giftCardValidityDays(days)).toBe(expected)
  })

  it.each(['', '  ', '0', '-30', '1.5', 'abc'])('says nothing for %j', (days) => {
    expect(giftCardValidityDays(days)).toBeNull()
  })
})
