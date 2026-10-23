import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { useLoyalty } from '~/composables/useLoyalty'
import { setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * `useLoyalty` fetches through `useRequestApi` (it must forward the
 * session cookie and host during SSR) and runs the REAL `useAsyncData`
 * here, so each test sees the request it makes and the value it hands
 * back. Parsing and query building are table-tested in
 * `test/unit/app/utils/loyalty.spec.ts`.
 *
 * The store has the `loyalty` feature unless a test says otherwise:
 * without it `useLoyalty` asks nothing at all (the last suite).
 */

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())

mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('useRequestApi', () => () => api)

describe('useLoyalty', () => {
  beforeEach(() => {
    clearNuxtData()
    setTenantFeatures({ loyalty: true })
  })

  describe('fetchTransactions', () => {
    it('sends the filters in Django names and refetches when they change', async () => {
      api.routes({ '/api/loyalty/transactions': { count: 0, results: [] } })
      const params = ref<{ page?: number, transactionType?: string }>({ page: 1 })

      await useLoyalty().fetchTransactions(params)
      params.value = { page: 2, transactionType: 'EARN' }
      await vi.waitFor(() => expect(api.callsTo('/api/loyalty/transactions')).toHaveLength(2))

      expect(api.callsTo('/api/loyalty/transactions').map(call => call.options)).toEqual([
        { method: 'GET', query: { page: 1 } },
        { method: 'GET', query: { page: 2, transaction_type: 'EARN' } },
      ])
    })
  })

  describe.each([
    ['fetchSummary', () => useLoyalty().fetchSummary(), '/api/loyalty/summary', { pointsBalance: 100, totalXp: 500, level: 5, tier: null, pointsToNextTier: 200 }],
    ['fetchTiers', () => useLoyalty().fetchTiers(), '/api/loyalty/tiers', [{ id: 1 }]],
    ['fetchProductPoints', () => useLoyalty().fetchProductPoints(42, true), '/api/loyalty/product/42/points', { points: 12 }],
  ] as const)('%s', (_name, fetch, url, body) => {
    it(`GETs ${url} and hands back its answer`, async () => {
      api.routes({ [url]: body })

      const { data } = await fetch()

      expect(api.callsTo(url)).toEqual([{ url, options: { method: 'GET' } }])
      expect(data.value).toEqual(body)
    })

    it('surfaces a failed request as the error', async () => {
      api.routes({
        [url]: () => {
          throw new Error('Server error')
        },
      })

      const { data, error } = await fetch()

      expect(error.value?.message).toBe('Server error')
      expect(data.value).toBeUndefined()
    })
  })

  describe('fetchPointsPerProduct', () => {
    it('asks for every product\'s points and counts one that fails as zero', async () => {
      api.routes({
        '/api/loyalty/product/7/points': { productId: 7, potentialPoints: 12, tierMultiplierApplied: false },
        '/api/loyalty/product/8/points': () => {
          throw new Error('Server error')
        },
      })

      const points = await useLoyalty().fetchPointsPerProduct([7, 8])

      expect(api.callsTo('/api/loyalty/product/*').map(call => call.url)).toEqual([
        '/api/loyalty/product/7/points',
        '/api/loyalty/product/8/points',
      ])
      expect(points).toEqual(new Map([[7, 12], [8, 0]]))
    })
  })

  // The caller's own condition (a signed-in shopper): no request until it
  // holds, and one as soon as it does.
  describe('fetchProductPoints gating', () => {
    // Its own product: a key's options are its first reader's, and the
    // generic case above already registered product 42 outside any scope.
    const URL = '/api/loyalty/product/43/points'

    it('asks nothing while disabled, and asks once it is enabled', async () => {
      api.routes({ [URL]: { productId: 43, potentialPoints: 12, tierMultiplierApplied: false } })
      const enabled = ref(false)

      const { data } = useLoyalty().fetchProductPoints(43, enabled)
      await flushPromises()
      expect(api.callsTo(URL)).toEqual([])

      enabled.value = true
      await flushPromises()

      expect(api.callsTo(URL)).toHaveLength(1)
      expect(data.value).toMatchObject({ potentialPoints: 12 })
    })
  })

  // Django refuses every loyalty read of a store with the programme
  // switched off and logs `feature_gate:refused`, which pages the team.
  // Components gate what they RENDER, and one that forgot to gate its
  // request did exactly that on webside's checkout; so `useLoyalty`
  // itself asks nothing there, whoever calls it.
  describe('on a store without the loyalty feature', () => {
    type Loyalty = ReturnType<typeof useLoyalty>
    // One entry per method: the completeness test below fails on a new
    // fetch that is not listed, so none can join ungated.
    const FETCHES: Record<keyof Loyalty, (loyalty: Loyalty) => Promise<unknown>> = {
      fetchSummary: async loyalty => (await loyalty.fetchSummary()).data.value,
      fetchTransactions: async loyalty => (await loyalty.fetchTransactions({ page: 1 })).data.value,
      fetchTiers: async loyalty => (await loyalty.fetchTiers()).data.value,
      fetchProductPoints: async loyalty => (await loyalty.fetchProductPoints(44, true)).data.value,
      // Its first entry: none, when nothing was asked.
      fetchPointsPerProduct: async loyalty => [...await loyalty.fetchPointsPerProduct([44])][0],
    }

    beforeEach(async () => {
      setTenantFeatures({ loyalty: false })
      api.routes({ '/api/loyalty/*': { pointsBalance: 1 } })
      // Keyed fetches the earlier tests registered outside any component
      // live on, and refetched while the feature flipped back on for the
      // outer `beforeEach`: count only what this test asks.
      await flushPromises()
      api.mockClear()
    })

    it('lists every fetch useLoyalty has', () => {
      expect(Object.keys(useLoyalty()).sort()).toEqual(Object.keys(FETCHES).sort())
    })

    it.each(Object.entries(FETCHES))('%s asks nothing and hands back nothing', async (_name, fetch) => {
      const value = await fetch(useLoyalty())
      await flushPromises()

      expect(api.callsTo('/api/loyalty/*')).toEqual([])
      expect(value).toBeUndefined()
    })
  })
})
