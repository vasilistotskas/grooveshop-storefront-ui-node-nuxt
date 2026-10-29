import { describe, expect, it } from 'vitest'
import recommendations from '~~/server/api/products/[id]/recommendations.get'
import reviews from '~~/server/api/products/[id]/reviews.get'
import relatedPosts from '~~/server/api/blog/posts/[id]/related-posts.get'
import promotions from '~~/server/api/promotions/product/[productId].get'
import variants from '~~/server/api/products/[id]/variants.get'
import { cacheOptionsOf } from '~~/test/helpers/nitro'

const HOUR = 60 * 60

/**
 * How long a route keeps an entry follows what clears it.
 *
 * Django's cache surfaces (`core/cache/surfaces.py`) purge these three
 * handlers when the data behind them changes (`ProductReviewsViewSet` and
 * `productRecommendations` by name, the related posts through the `blog`
 * surface's `*Blog*` sweep), so the TTL only bounds a missed purge and an
 * hour or more saves the Django round trips of a long tail of products
 * (about a thousand a day each). The other two have no purge that covers
 * them, so they stay short:
 *
 * - the product offers change when a promotion's window opens or closes,
 *   and nothing is saved then (`promotion/tasks.py`), so no signal purges
 *   `ProductPromotionList`;
 * - `ProductVariantsViewSet` is named in no surface's `nuxt_patterns`.
 */
describe('cache lifetimes', () => {
  it.each([
    ['product reviews', reviews],
    ['recommendations', recommendations],
    ['related posts', relatedPosts],
  ])('%s are kept for at least an hour, as Django purges them', (_name, handler) => {
    expect(cacheOptionsOf(handler).maxAge).toBeGreaterThanOrEqual(HOUR)
  })

  it.each([
    ['product offers', promotions],
    ['product variants', variants],
  ])('%s stay short, as nothing purges them', (_name, handler) => {
    expect(cacheOptionsOf(handler).maxAge).toBeLessThanOrEqual(HOUR / 4)
  })
})
