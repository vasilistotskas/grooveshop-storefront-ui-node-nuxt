export interface StarBucket {
  stars: number
  count: number
  /** Share of all reviews, 0..100, rounded to a whole percent. */
  percent: number
}

/**
 * The API counts reviews per rate on its 1..10 scale; the page shows five
 * stars, as everywhere else a rate is halved. A rate of 7 (3.5 stars) rounds
 * up into the four-star bucket, so 1-2 -> 1, 3-4 -> 2 ... 9-10 -> 5.
 * Returns five buckets, best first, each present even when empty.
 */
export function starBuckets(distribution: readonly RatingDistribution[]): StarBucket[] {
  const counts = [0, 0, 0, 0, 0]
  for (const { rate, count } of distribution) {
    const index = Math.min(5, Math.max(1, Math.ceil(rate / 2))) - 1
    counts[index]! += count
  }
  const total = counts.reduce((sum, count) => sum + count, 0)
  return counts
    .map((count, index) => ({
      stars: index + 1,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .reverse()
}
