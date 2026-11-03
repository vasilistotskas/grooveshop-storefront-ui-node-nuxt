import { describe, it, expect } from 'vitest'
import {
  buildLoyaltyTransactionsQuery,
  tierProgress,
  tierStartXp,
} from '~/utils/loyalty'

describe('buildLoyaltyTransactionsQuery', () => {
  it('renames every filter to its Django name', () => {
    expect(buildLoyaltyTransactionsQuery({
      page: 2,
      transactionType: 'EARN',
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    })).toEqual({
      page: 2,
      transaction_type: 'EARN',
      created_after: '2026-01-01',
      created_before: '2026-01-31',
    })
  })

  it.each([
    ['no params', undefined],
    ['empty params', {}],
    ['params explicitly undefined', { page: undefined, transactionType: undefined, dateFrom: undefined, dateTo: undefined }],
  ])('sends no query for %s', (_label, params) => {
    expect(buildLoyaltyTransactionsQuery(params)).toEqual({})
  })

  it('leaves out only the unset filters', () => {
    expect(buildLoyaltyTransactionsQuery({ page: 1, dateTo: '2026-02-01' }))
      .toEqual({ page: 1, created_before: '2026-02-01' })
  })
})

describe('tierStartXp', () => {
  it.each([
    [1, 1000, 0],
    [3, 1000, 2000],
    [5, 2500, 10000],
  ])('starts a tier that needs level %i at %i XP per level on %i XP', (requiredLevel, xpPerLevel, expected) => {
    expect(tierStartXp({ requiredLevel }, xpPerLevel)).toBe(expected)
  })
})

describe('tierProgress', () => {
  it('measures the way from one tier start to the next', () => {
    expect(tierProgress(2500, 2000, 4000)).toBe(25)
  })

  it.each([
    ['below the start', 1500, 0],
    ['past the next start', 4500, 100],
  ])('keeps a total %s inside 0–100', (_case, totalXp, expected) => {
    expect(tierProgress(totalXp, 2000, 4000)).toBe(expected)
  })

  it('is full when there is no step left to take', () => {
    expect(tierProgress(5000, 4000, 4000)).toBe(100)
  })
})
