import { describe, it, expect } from 'vitest'
import { lowStockLeft } from '~/utils/stock'

describe('lowStockLeft', () => {
  it.each([
    { stock: 0, lowStockThreshold: 5, left: null },
    { stock: -2, lowStockThreshold: 5, left: null },
    { stock: 5, lowStockThreshold: 5, left: 5 },
    { stock: 6, lowStockThreshold: 5, left: null },
    // No threshold of the merchant's: low is 10 or fewer.
    { stock: 10, lowStockThreshold: 0, left: 10 },
    { stock: 11, lowStockThreshold: 0, left: null },
    { stock: 3, lowStockThreshold: null, left: 3 },
  ])('warns of $left for $stock in stock against a threshold of $lowStockThreshold', ({ stock, lowStockThreshold, left }) => {
    expect(lowStockLeft({ stock, lowStockThreshold })).toBe(left)
  })
})
