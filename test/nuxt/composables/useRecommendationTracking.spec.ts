/**
 * An impression is one showing: it goes out with no id, because the
 * suggestions body is cached and shared, and Django answers with the id it
 * minted for this showing. The strip's clicks carry that id, and the
 * add-to-cart after a click sends it on. The click must survive the
 * navigation it causes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import type { Ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { RecommendationItem } from '~~/shared/openapi/types.gen'
import { makeProduct } from '~~/test/fixtures/product'
import { failWith } from '~~/test/helpers/api'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const SHOWING = '3f9c2b6e-1d5a-4c8b-9e7f-2a1b3c4d5e6f'
const ANOTHER_SHOWING = '9b2e4c1a-7d3f-4e5b-8a6c-1f2e3d4c5b6a'
const ENDPOINT = '/api/analytics/recommendation-event'

const item = (id: number, strategy: RecommendationItem['reason']['strategy']): RecommendationItem => ({
  product: makeProduct({ id }),
  reason: { strategy, relationType: null, score: 1 },
})

/** Django's answer: the id the showing was recorded under. */
const recordedAs = (impressionId: string) => () => ({ detail: 'ok', impressionId })

describe('useRecommendationTracking', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    api.routes({ [ENDPOINT]: recordedAs(SHOWING) })
  })

  it('posts one impression for the strip with no id, each tile with its strategy and position', () => {
    const { trackImpression } = useRecommendationTracking('pdp', 42)

    trackImpression([item(7, 'curated'), item(8, 'attributes')])

    expect(api.callsTo(ENDPOINT)).toEqual([{
      url: ENDPOINT,
      options: {
        method: 'POST',
        body: {
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

  it('posts a click under the id the impression was recorded under, and remembers it for the add-to-cart', async () => {
    const { trackImpression, trackClick } = useRecommendationTracking('cart')
    trackImpression([item(8, 'popular')])

    await trackClick(item(8, 'popular'), 3)

    expect(api.callsTo(ENDPOINT)[1]).toEqual({
      url: ENDPOINT,
      options: expect.objectContaining({
        body: {
          impressionId: SHOWING,
          surface: 'cart',
          kind: 'click',
          items: [{ productId: 8, strategy: 'popular', position: 3 }],
        },
        keepalive: true,
      }),
    })
    expect(useRecommendationAttribution().take(8)).toBe(SHOWING)
  })

  it('reports no click for a showing whose impression was not recorded', async () => {
    api.routes({ [ENDPOINT]: failWith(503) })
    const { trackImpression, trackClick } = useRecommendationTracking('pdp', 42)
    trackImpression([item(7, 'curated')])

    await trackClick(item(7, 'curated'), 0)

    expect(api.callsTo(ENDPOINT)).toHaveLength(1)
    expect(useRecommendationAttribution().take(7)).toBeUndefined()
  })

  it('gives each strip on the page a showing of its own', async () => {
    let next = 0
    const ids = [SHOWING, ANOTHER_SHOWING]
    api.routes({ [ENDPOINT]: (_url: string, options: any) => (
      options.body.kind === 'impression' ? { detail: 'ok', impressionId: ids[next++] } : { detail: 'ok', impressionId: options.body.impressionId }
    ) })
    const first = useRecommendationTracking('pdp', 42)
    const second = useRecommendationTracking('pdp', 42)
    first.trackImpression([item(7, 'curated')])
    second.trackImpression([item(7, 'curated')])

    await first.trackClick(item(7, 'curated'), 0)
    await second.trackClick(item(7, 'curated'), 0)

    const clicks = api.callsTo(ENDPOINT).filter(call => call.options.body.kind === 'click')
    expect(clicks.map(call => call.options.body.impressionId)).toEqual([SHOWING, ANOTHER_SHOWING])
  })

  it('sends a seed id of 0, which is a real product id', () => {
    useRecommendationTracking('pdp', 0).trackImpression([item(7, 'curated')])

    expect(api.callsTo(ENDPOINT)[0]!.options.body.seedId).toBe(0)
  })

  it('posts nothing for an empty strip', () => {
    useRecommendationTracking('pdp', 42).trackImpression([])

    expect(api.callsTo(ENDPOINT)).toEqual([])
  })

  describe('trackImpressionWhenShown', () => {
    const response = (items: RecommendationItem[]) => ({ surface: 'pdp' as const, items })
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

      data.value = response([])
      await nextTick()
      expect(api.callsTo(ENDPOINT)).toEqual([])

      data.value = response([item(7, 'curated')])
      await nextTick()
      data.value = response([item(8, 'popular')])
      await nextTick()

      const calls = api.callsTo(ENDPOINT)
      expect(calls).toHaveLength(1)
      expect(calls[0]!.options.body).toMatchObject({ kind: 'impression', seedId: 42 })
      // The showing's id is Django's to mint: an impression carries none.
      expect(calls[0]!.options.body).not.toHaveProperty('impressionId')
    })

    it('reports at mount when the answer is already there (a server-rendered strip)', async () => {
      await mountStrip(ref(response([item(7, 'curated')])))
      await flushPromises()

      expect(api.callsTo(ENDPOINT)).toHaveLength(1)
    })
  })
})
