/**
 * Tracking echoes the suggestions response's `impressionId` so Django can
 * tie impression, click and the later add-to-cart back to the strategy
 * that earned them. The click must survive the navigation it causes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { RecommendationItem } from '~~/shared/openapi/types.gen'
import { makeProduct } from '~~/test/fixtures/product'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const IMPRESSION = '3f9c2b6e-1d5a-4c8b-9e7f-2a1b3c4d5e6f'
const ENDPOINT = '/api/analytics/recommendation-event'

const item = (id: number, strategy: RecommendationItem['reason']['strategy']): RecommendationItem => ({
  product: makeProduct({ id }),
  reason: { strategy, relationType: null, score: 1 },
})

describe('useRecommendationTracking', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('posts one impression for the strip, each tile with its strategy and position', () => {
    const { trackImpression } = useRecommendationTracking('pdp', 42)

    trackImpression(IMPRESSION, [item(7, 'curated'), item(8, 'co_view')])

    expect(api.callsTo(ENDPOINT)).toEqual([{
      url: ENDPOINT,
      options: {
        method: 'POST',
        body: {
          impressionId: IMPRESSION,
          surface: 'pdp',
          kind: 'impression',
          seedId: 42,
          items: [
            { productId: 7, strategy: 'curated', position: 0 },
            { productId: 8, strategy: 'co_view', position: 1 },
          ],
        },
        keepalive: true,
      },
    }])
  })

  it('posts a click for the followed tile and remembers its impression for the add-to-cart', () => {
    const { trackClick } = useRecommendationTracking('cart')

    trackClick(IMPRESSION, item(8, 'popular'), 3)

    expect(api.callsTo(ENDPOINT)).toEqual([{
      url: ENDPOINT,
      options: expect.objectContaining({
        body: {
          impressionId: IMPRESSION,
          surface: 'cart',
          kind: 'click',
          items: [{ productId: 8, strategy: 'popular', position: 3 }],
        },
        keepalive: true,
      }),
    }])
    expect(useRecommendationAttribution().take(8)).toBe(IMPRESSION)
  })

  it('sends a seed id of 0, which is a real product id', () => {
    useRecommendationTracking('pdp', 0).trackImpression(IMPRESSION, [item(7, 'curated')])

    expect(api.callsTo(ENDPOINT)[0]!.options.body.seedId).toBe(0)
  })

  it('posts nothing for an empty strip', () => {
    useRecommendationTracking('pdp', 42).trackImpression(IMPRESSION, [])

    expect(api.callsTo(ENDPOINT)).toEqual([])
  })
})
