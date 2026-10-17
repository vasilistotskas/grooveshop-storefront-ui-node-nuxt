/**
 * The orders a product's reviews can be read in, as the API's `ordering`
 * takes them. The later keys break a tie, so two five-star reviews keep a
 * stable, newest-first order across pages.
 */
export const REVIEW_SORTS = {
  newest: '-createdAt',
  highest: '-rate,-createdAt',
  lowest: 'rate,-createdAt',
} as const

export type ReviewSort = keyof typeof REVIEW_SORTS

export const REVIEW_SORT_KEYS = Object.keys(REVIEW_SORTS) as ReviewSort[]

/** What the product page's server render fetches: the list a visitor opens on. */
export const DEFAULT_REVIEW_SORT: ReviewSort = 'newest'
