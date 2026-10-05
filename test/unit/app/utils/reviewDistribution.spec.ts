import { describe, it, expect } from 'vitest'
import { starBuckets } from '~/utils/reviewDistribution'

describe('starBuckets', () => {
  it('folds the 1..10 rates into five stars, best first, rounding half stars up', () => {
    const buckets = starBuckets([
      { rate: 10, count: 6 },
      { rate: 9, count: 2 },
      { rate: 7, count: 1 },
      { rate: 3, count: 1 },
    ])

    expect(buckets.map(b => [b.stars, b.count])).toEqual([[5, 8], [4, 1], [3, 0], [2, 1], [1, 0]])
  })

  it('puts the lowest rates in one star', () => {
    expect(starBuckets([{ rate: 1, count: 2 }, { rate: 2, count: 3 }]).at(-1)).toMatchObject({ stars: 1, count: 5, percent: 100 })
  })

  it('reports each bucket as a whole percent of all reviews', () => {
    const buckets = starBuckets([{ rate: 10, count: 1 }, { rate: 2, count: 2 }])

    expect(buckets.map(b => b.percent)).toEqual([33, 0, 0, 0, 67])
  })

  it('is five empty buckets with no reviews', () => {
    expect(starBuckets([])).toEqual([5, 4, 3, 2, 1].map(stars => ({ stars, count: 0, percent: 0 })))
  })
})
