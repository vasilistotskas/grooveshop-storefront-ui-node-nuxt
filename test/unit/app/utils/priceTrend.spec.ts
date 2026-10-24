import { describe, expect, it } from 'vitest'
import { priceTrend, priceTrendRanges } from '~/utils/priceTrend'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-10-24T12:00:00Z')
const iso = (time: number) => new Date(time).toISOString()

/** The demo power bank: 49.48 € for a month, 39.58 € since 21 Sep. */
const spells: ProductPriceSpell[] = [
  { validFrom: '2026-08-21T15:20:28Z', validTo: '2026-09-21T15:20:28Z', price: 49.48 },
  { validFrom: '2026-09-21T15:20:28Z', validTo: null, price: 39.58 },
]

describe('priceTrendRanges', () => {
  it('offers the ranges that cut into the history, then all of it', () => {
    expect(priceTrendRanges(spells, NOW)).toEqual(['1m', 'all'])
  })

  it('offers every range for a long history', () => {
    const long = [{ validFrom: iso(NOW - 800 * DAY), validTo: null, price: 10 }]
    expect(priceTrendRanges(long, NOW)).toEqual(['1m', '3m', '6m', '1y', 'all'])
  })

  it('offers nothing without a recorded price', () => {
    expect(priceTrendRanges([], NOW)).toEqual([])
  })
})

describe('priceTrend', () => {
  it('draws a change as a step at the moment it happened', () => {
    const trend = priceTrend(spells, 'all', NOW)!
    const change = Date.parse('2026-09-21T15:20:28Z')

    const atChange = trend.points.filter(point => point.time === change)
    expect(atChange.map(point => point.price)).toEqual([49.48, 39.58])
    // Before the change only the old price, after it only the new one.
    expect(trend.points.filter(p => p.time < change).every(p => p.price === 49.48)).toBe(true)
    expect(trend.points.filter(p => p.time > change).every(p => p.price === 39.58)).toBe(true)
  })

  it('samples the curve daily between changes, from the first price to now', () => {
    const trend = priceTrend(spells, 'all', NOW)!

    expect(trend.points[0]!.time).toBe(Date.parse('2026-08-21T15:20:28Z'))
    expect(trend.points.at(-1)!.time).toBe(NOW)
    const gaps = trend.points.slice(1).map((p, i) => p.time - trend.points[i]!.time)
    expect(Math.max(...gaps)).toBeLessThanOrEqual(DAY)
  })

  it('samples weekly once the history outgrows daily points', () => {
    const long = [{ validFrom: iso(NOW - 800 * DAY), validTo: null, price: 10 }]
    const trend = priceTrend(long, 'all', NOW)!

    expect(trend.points.length).toBeLessThan(130)
  })

  it('states the range\'s lowest, highest and change', () => {
    const trend = priceTrend(spells, 'all', NOW)!

    expect(trend.current).toBe(39.58)
    expect(trend.lowest).toBe(39.58)
    expect(trend.highest).toBe(49.48)
    expect(trend.change).toBeCloseTo(-9.9, 2)
    expect(trend.changeRatio).toBeCloseTo(-0.2001, 3)
    expect(trend.changes).toBe(1)
    expect(trend.currentSince).toBe(Date.parse('2026-09-21T15:20:28Z'))
  })

  it('reads a range from its own start: within the last month the price did not change', () => {
    const trend = priceTrend(spells, '1m', NOW)!

    expect(trend.start).toBe(NOW - 30 * DAY)
    expect(trend.change).toBe(0)
    expect(trend.changes).toBe(0)
    expect(trend.highest).toBe(39.58)
  })

  it('counts back-to-back spells at one price as one period', () => {
    const resplit: ProductPriceSpell[] = [
      { validFrom: iso(NOW - 20 * DAY), validTo: iso(NOW - 10 * DAY), price: 20 },
      { validFrom: iso(NOW - 10 * DAY), validTo: null, price: 20 },
    ]
    const trend = priceTrend(resplit, 'all', NOW)!

    expect(trend.changes).toBe(0)
    expect(trend.currentSince).toBe(NOW - 20 * DAY)
  })

  it('is nothing without a recorded price', () => {
    expect(priceTrend([], 'all', NOW)).toBeNull()
  })
})
