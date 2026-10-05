import { describe, it, expect } from 'vitest'
import { giftCardValidity } from '~/utils/giftCardValidity'

describe('giftCardValidity', () => {
  it.each([
    ['1825', { count: 5, unit: 'year' }],
    ['365', { count: 1, unit: 'year' }],
    ['90', { count: 3, unit: 'month' }],
    ['45', { count: 45, unit: 'day' }],
    ['400', { count: 400, unit: 'day' }],
  ])('reads %s days as %j', (days, expected) => {
    expect(giftCardValidity(days)).toEqual(expected)
  })

  it.each(['', '  ', '0', '-30', '1.5', 'abc'])('says nothing for %j', (days) => {
    expect(giftCardValidity(days)).toBeNull()
  })
})
