import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { useLoyalty } from '~/composables/useLoyalty'
import { defaultLoyaltySettings } from '~/utils/loyalty'

/**
 * `useLoyalty` fetches through `useRequestApi` (it must forward the
 * session cookie and host during SSR) and runs the REAL `useAsyncData`
 * here, so each test sees the request it makes and the value it hands
 * back. Parsing and query building are table-tested in
 * `test/unit/app/utils/loyalty.spec.ts`.
 */

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
const { mockLog } = vi.hoisted(() => ({
  mockLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('useRequestApi', () => () => api)
mockNuxtImport('log', () => mockLog)

describe('useLoyalty', () => {
  beforeEach(() => {
    clearNuxtData()
  })

  describe('fetchSettings', () => {
    it('requests the eight loyalty keys in one call and parses the answer', async () => {
      api.routes({
        '/api/loyalty/settings': {
          LOYALTY_ENABLED: 'true',
          LOYALTY_REDEMPTION_RATIO_EUR: '',
          LOYALTY_XP_PER_LEVEL: '2500',
        },
      })

      const { data } = await useLoyalty().fetchSettings()

      expect(api.callsTo('/api/loyalty/settings')).toEqual([{
        url: '/api/loyalty/settings',
        options: {
          query: {
            keys: 'LOYALTY_ENABLED,LOYALTY_REDEMPTION_RATIO_EUR,LOYALTY_POINTS_FACTOR,'
              + 'LOYALTY_TIER_MULTIPLIER_ENABLED,LOYALTY_POINTS_EXPIRATION_DAYS,'
              + 'LOYALTY_NEW_CUSTOMER_BONUS_ENABLED,LOYALTY_NEW_CUSTOMER_BONUS_POINTS,LOYALTY_XP_PER_LEVEL',
          },
        },
      }])
      expect(data.value).toMatchObject({ enabled: true, redemptionRatioEur: 100, xpPerLevel: 2500 })
    })

    it('answers the defaults and logs when the request fails', async () => {
      const failure = new Error('Network error')
      api.routes({
        '/api/loyalty/settings': () => {
          throw failure
        },
      })

      const { data, error } = await useLoyalty().fetchSettings()

      expect(error.value).toBeUndefined()
      expect(data.value).toEqual(defaultLoyaltySettings())
      expect(mockLog.error).toHaveBeenCalledWith({ action: 'loyalty:fetchSettings', error: failure })
    })
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

  // Django answers 404 for a store with loyalty off: no request until the
  // caller says the points can exist, and one as soon as it does.
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
})
