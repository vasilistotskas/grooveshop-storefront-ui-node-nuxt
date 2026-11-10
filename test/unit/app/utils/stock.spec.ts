import { describe, it, expect } from 'vitest'
import { lowStockLeft } from '~/utils/stock'

describe('lowStockLeft', () => {
  it.each([
    { stock: 0, lowStockThreshold: 5, left: null },
    { stock: -2, lowStockThreshold: 5, left: null },
    { stock: 5, lowStockThreshold: 5, left: 5 },
    { stock: 6, lowStockThreshold: 5, left: null },
    // A threshold of 0 switches the hint off: never low.
    { stock: 3, lowStockThreshold: 0, left: null },
    { stock: 1, lowStockThreshold: 0, left: null },
    { stock: 0, lowStockThreshold: 0, left: null },
    // No threshold at all (a search hit may carry null): nothing to compare.
    { stock: 3, lowStockThreshold: null, left: null },
    { stock: 3, lowStockThreshold: undefined, left: null },
  ])('warns of $left for $stock in stock against a threshold of $lowStockThreshold', ({ stock, lowStockThreshold, left }) => {
    expect(lowStockLeft({ stock, lowStockThreshold })).toBe(left)
  })
})
