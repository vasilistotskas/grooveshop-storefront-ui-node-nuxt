import { describe, it, expect } from 'vitest'
import { deliveryEstimate, parseDispatchCutoff } from '~/utils/delivery'

describe('parseDispatchCutoff', () => {
  it.each(['15:00', '00:00', '09:30', '23:59'])('keeps the clock time %s', (value) => {
    expect(parseDispatchCutoff(value)).toBe(value)
  })

  it('trims the setting\'s whitespace', () => {
    expect(parseDispatchCutoff(' 15:00 ')).toBe('15:00')
  })

  it.each(['', undefined, '3pm', '15', '24:00', '15:60', '9:30', '15:00:00'])(
    'shows nothing for %j: no cutoff, or not a clock time',
    (value) => {
      expect(parseDispatchCutoff(value)).toBeNull()
    },
  )
})

describe('deliveryEstimate', () => {
  it('hands back both ends of an advertised range', () => {
    expect(deliveryEstimate({ deliveryDaysMin: 2, deliveryDaysMax: 4 })).toEqual({ min: 2, max: 4 })
  })

  it('keeps a zero: same-day is an estimate, not an absence', () => {
    expect(deliveryEstimate({ deliveryDaysMin: 0, deliveryDaysMax: 1 })).toEqual({ min: 0, max: 1 })
  })

  it.each([
    { deliveryDaysMin: null, deliveryDaysMax: null },
    { deliveryDaysMin: 2, deliveryDaysMax: null },
    { deliveryDaysMin: null, deliveryDaysMax: 4 },
  ])('is no estimate when the rate advertises none or half of one: %j', (option) => {
    expect(deliveryEstimate(option)).toBeNull()
  })
})
