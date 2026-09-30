import { describe, expect, it } from 'vitest'

import {
  zLoyaltySummary,
  zLoyaltyTier,
  zPaginatedPointsTransactionList,
  zPointsTransaction,
  zProductPoints,
} from '~~/shared/openapi/zod.gen'
import {
  makeProductPoints,
  makeSummary,
  makeTier,
  makeTransaction,
  makeTransactionPage,
} from '~~/test/fixtures/loyalty'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/**
 * The loyalty fixtures replace the hand-built summaries, tiers and
 * transaction pages the loyalty specs used to spell out (a tier with
 * `pointsMultiplier: '1.5'` as a string, pages with a DRF `next` at the
 * root). Parsed strictly, so a renamed field fails here rather than as a
 * spec passing against a payload Django cannot send.
 */
describe('loyalty fixtures', () => {
  it.each([
    ['makeTier', zLoyaltyTier, makeTier()],
    ['makeSummary', zLoyaltySummary, makeSummary()],
    ['makeSummary with a tier', zLoyaltySummary, makeSummary({ tier: makeTier({ id: 2 }), pointsToNextTier: null })],
    ['makeTransaction', zPointsTransaction, makeTransaction()],
    ['makeProductPoints', zProductPoints, makeProductPoints()],
  ] as const)('%s parses strictly', (_name, schema, value) => {
    expect(problems(schema, value)).toEqual([])
  })

  it('builds a transaction page that parses strictly, numbering its rows', () => {
    const page = makeTransactionPage([{ points: 10 }, { points: -5, transactionType: 'REDEEM', referenceOrder: null }])

    expect(problems(zPaginatedPointsTransactionList, page)).toEqual([])
    expect(page.results.map(row => row.id)).toEqual([1, 2])
    expect(page).toMatchObject({ count: 2, totalPages: 1, pageSize: 12 })
  })

  it('derives the page count from count and pageSize', () => {
    expect(makeTransactionPage([{}], { count: 30 }).totalPages).toBe(3)
  })
})
