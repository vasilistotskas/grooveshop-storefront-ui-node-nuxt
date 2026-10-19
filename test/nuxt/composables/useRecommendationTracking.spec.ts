/**
 * Tracking echoes the suggestions response's `impressionId` so Django can
 * tie impression, click and the later add-to-cart back to the strategy
 * that earned them. The click must survive the navigation it causes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import type { Ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
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

    trackImpression(IMPRESSION, [item(7, 'curated'), item(8, 'attributes')])

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
            { productId: 8, strategy: 'attributes', position: 1 },
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

  describe('trackImpressionWhenShown', () => {
    const response = (impressionId: string, items: RecommendationItem[]) => ({ surface: 'pdp' as const, impressionId, items })
    const mountStrip = (data: Ref<ReturnType<typeof response> | null>) => mountSuspended(defineComponent({
      setup() {
        useRecommendationTracking('pdp', 42).trackImpressionWhenShown(data)
        return () => h('div')
      },
    }), { route: false })

    it('reports once the answer arrives after mount, and only once', async () => {
      const data = ref<ReturnType<typeof response> | null>(null)
      await mountStrip(data)
      expect(api.callsTo(ENDPOINT)).toEqual([])

      data.value = response(IMPRESSION, [])
      await nextTick()
      expect(api.callsTo(ENDPOINT)).toEqual([])

      data.value = response(IMPRESSION, [item(7, 'curated')])
      await nextTick()
      data.value = response('9b2e4c1a-7d3f-4e5b-8a6c-1f2e3d4c5b6a', [item(8, 'popular')])
      await nextTick()

      const calls = api.callsTo(ENDPOINT)
      expect(calls).toHaveLength(1)
      expect(calls[0]!.options.body).toMatchObject({ impressionId: IMPRESSION, kind: 'impression', seedId: 42 })
    })

    it('reports at mount when the answer is already there (a server-rendered strip)', async () => {
      await mountStrip(ref(response(IMPRESSION, [item(7, 'curated')])))

      expect(api.callsTo(ENDPOINT)).toHaveLength(1)
    })
  })
})
