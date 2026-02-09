import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { LoyaltySummary, PaginatedPointsTransactionList, RedeemPointsResponse, ProductPoints } from '#shared/openapi/types.gen'

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Mock useAsyncData
const mockUseAsyncData = vi.fn()
vi.mock('#app', () => ({
  useAsyncData: mockUseAsyncData,
  refreshNuxtData: vi.fn(),
}))

describe('useLoyalty Composable', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockUseAsyncData.mockReset()
  })

  describe('fetchSummary', () => {
    it('should return useAsyncData result with correct key', () => {
      const mockData = ref<LoyaltySummary>({
        pointsBalance: 100,
        totalXp: 500,
        level: 5,
        tier: null,
        pointsToNextTier: 200,
      })

      mockUseAsyncData.mockReturnValue({
        data: mockData,
        status: ref('success'),
        error: ref(null),
        refresh: vi.fn(),
      })

      const { fetchSummary } = useLoyalty()
      const result = fetchSummary()

      expect(mockUseAsyncData).toHaveBeenCalledWith(
        'loyalty-summary',
        expect.any(Function),
      )
      expect(result.data.value).toEqual(mockData.value)
    })

    it('should handle error state', () => {
      const mockError = new Error('Network error')

      mockUseAsyncData.mockReturnValue({
        data: ref(null),
        status: ref('error'),
        error: ref(mockError),
        refresh: vi.fn(),
      })

      const { fetchSummary } = useLoyalty()
      const result = fetchSummary()

      expect(result.status.value).toBe('error')
      expect(result.error.value).toBe(mockError)
    })

    it('should handle pending state', () => {
      mockUseAsyncData.mockReturnValue({
        data: ref(null),
        status: ref('pending'),
        error: ref(null),
        refresh: vi.fn(),
      })

      const { fetchSummary } = useLoyalty()
      const result = fetchSummary()

      expect(result.status.value).toBe('pending')
    })
  })

  describe('fetchTransactions', () => {
    it('should return useAsyncData result with dynamic key based on params', () => {
      const params = { page: 2, transactionType: 'EARN' }
      const mockData = ref<PaginatedPointsTransactionList>({
        count: 10,
        results: [],
      })

      mockUseAsyncData.mockReturnValue({
        data: mockData,
        status: ref('success'),
        error: ref(null),
        refresh: vi.fn(),
      })

      const { fetchTransactions } = useLoyalty()
      const result = fetchTransactions(params)

      expect(mockUseAsyncData).toHaveBeenCalledWith(
        expect.stringContaining('loyalty-transactions'),
        expect.any(Function),
      )
      expect(result.data.value).toEqual(mockData.value)
    })

    it('should handle empty params', () => {
      mockUseAsyncData.mockReturnValue({
        data: ref(null),
        status: ref('pending'),
        error: ref(null),
        refresh: vi.fn(),
      })

      const { fetchTransactions } = useLoyalty()
      const result = fetchTransactions()

      expect(mockUseAsyncData).toHaveBeenCalled()
      expect(result.status.value).toBe('pending')
    })
  })

  describe('fetchSettings', () => {
    it('should return useAsyncData result with settings key', () => {
      const mockData = ref({
        enabled: true,
        redemptionRatioEur: 100,
        pointsFactor: 1.0,
        tierMultiplierEnabled: true,
        pointsExpirationDays: 365,
        newCustomerBonusEnabled: true,
        newCustomerBonusPoints: 100,
        xpPerLevel: 1000,
      })

      mockUseAsyncData.mockReturnValue({
        data: mockData,
        status: ref('success'),
        error: ref(null),
        refresh: vi.fn(),
      })

      const { fetchSettings } = useLoyalty()
      const result = fetchSettings()

      expect(mockUseAsyncData).toHaveBeenCalledWith(
        'loyalty-settings',
        expect.any(Function),
      )
      expect(result.data.value).toEqual(mockData.value)
    })
  })

  describe('fetchTiers', () => {
    it('should return useAsyncData result with tiers key', () => {
      const mockData = ref([
        {
          id: 1,
          name: 'Bronze',
          requiredLevel: 1,
          pointsMultiplier: '1.0',
          translations: {},
        },
      ])

      mockUseAsyncData.mockReturnValue({
        data: mockData,
        status: ref('success'),
        error: ref(null),
        refresh: vi.fn(),
      })

      const { fetchTiers } = useLoyalty()
      const result = fetchTiers()

      expect(mockUseAsyncData).toHaveBeenCalledWith(
        'loyalty-tiers',
        expect.any(Function),
      )
      expect(result.data.value).toEqual(mockData.value)
    })
  })

  describe('fetchProductPoints', () => {
    it('should return useAsyncData result with product-specific key', () => {
      const productId = 123
      const mockData = ref<ProductPoints>({
        productId: 123,
        potentialPoints: 50,
        tierMultiplierApplied: true,
      })

      mockUseAsyncData.mockReturnValue({
        data: mockData,
        status: ref('success'),
        error: ref(null),
        refresh: vi.fn(),
      })

      const { fetchProductPoints } = useLoyalty()
      const result = fetchProductPoints(productId)

      expect(mockUseAsyncData).toHaveBeenCalledWith(
        `loyalty-product-points-${productId}`,
        expect.any(Function),
      )
      expect(result.data.value).toEqual(mockData.value)
    })

    it('should handle errors gracefully', () => {
      const productId = 456
      const mockError = new Error('Product not found')

      mockUseAsyncData.mockReturnValue({
        data: ref(null),
        status: ref('error'),
        error: ref(mockError),
        refresh: vi.fn(),
      })

      const { fetchProductPoints } = useLoyalty()
      const result = fetchProductPoints(productId)

      expect(result.status.value).toBe('error')
      expect(result.error.value).toBe(mockError)
    })
  })

  describe('redeemPoints', () => {
    it('should call $fetch and return response', async () => {
      const mockResponse: RedeemPointsResponse = {
        pointsRedeemed: 100,
        discountAmount: 1.0,
        currency: 'EUR',
        remainingBalance: 50,
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      const { redeemPoints } = useLoyalty()
      const result = await redeemPoints({ pointsAmount: 100, currency: 'EUR' })

      expect(mockFetch).toHaveBeenCalledWith('/api/loyalty/redeem', {
        method: 'POST',
        body: { pointsAmount: 100, currency: 'EUR' },
      })
      expect(result).toEqual(mockResponse)
    })

    it('should throw error on failure', async () => {
      const mockError = new Error('Insufficient balance')
      mockFetch.mockRejectedValueOnce(mockError)

      const { redeemPoints } = useLoyalty()

      await expect(
        redeemPoints({ pointsAmount: 100, currency: 'EUR' }),
      ).rejects.toThrow('Insufficient balance')
    })
  })

  describe('Integration', () => {
    it('should allow multiple fetch methods to be called', () => {
      mockUseAsyncData.mockReturnValue({
        data: ref(null),
        status: ref('pending'),
        error: ref(null),
        refresh: vi.fn(),
      })

      const loyalty = useLoyalty()

      loyalty.fetchSummary()
      loyalty.fetchTiers()
      loyalty.fetchSettings()

      expect(mockUseAsyncData).toHaveBeenCalledTimes(3)
    })
  })
})
