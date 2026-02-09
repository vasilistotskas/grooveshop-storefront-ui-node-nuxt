import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { LoyaltySummary, PaginatedPointsTransactionList, RedeemPointsResponse, ProductPoints } from '#shared/openapi/types.gen'

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

describe('useLoyalty Composable', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('Error Handling', () => {
    it('should set error state and loading false when fetchSummary fails', async () => {
      const error = new Error('Network error')
      mockFetch.mockRejectedValueOnce(error)

      const { fetchSummary, loading, error: errorRef } = useLoyalty()

      await fetchSummary()

      expect(errorRef.value).toBeInstanceOf(Error)
      expect(errorRef.value?.message).toBe('Network error')
      expect(loading.value).toBe(false)
    })

    it('should set error state and loading false when fetchTransactions fails', async () => {
      const error = new Error('API error')
      mockFetch.mockRejectedValueOnce(error)

      const { fetchTransactions, loading, error: errorRef } = useLoyalty()

      await fetchTransactions()

      expect(errorRef.value).toBeInstanceOf(Error)
      expect(errorRef.value?.message).toBe('API error')
      expect(loading.value).toBe(false)
    })

    it('should set error state and loading false when redeemPoints fails', async () => {
      const error = new Error('Insufficient balance')
      mockFetch.mockRejectedValueOnce(error)

      const { redeemPoints, loading, error: errorRef } = useLoyalty()

      await expect(redeemPoints({ pointsAmount: 100, currency: 'EUR' })).rejects.toThrow('Insufficient balance')

      expect(errorRef.value).toBeInstanceOf(Error)
      expect(errorRef.value?.message).toBe('Insufficient balance')
      expect(loading.value).toBe(false)
    })

    it('should return null and not set error state when fetchProductPoints fails (silent failure)', async () => {
      const error = new Error('Product not found')
      mockFetch.mockRejectedValueOnce(error)

      const { fetchProductPoints, error: errorRef } = useLoyalty()

      const result = await fetchProductPoints(123)

      expect(result).toBeNull()
      // Error should not be set in the composable state for silent failure
      expect(errorRef.value).toBeNull()
    })

    it('should clear error state on successful fetchSummary after previous error', async () => {
      const error = new Error('Network error')
      const mockSummary: LoyaltySummary = {
        pointsBalance: 100,
        totalXp: 500,
        level: 5,
        tier: null,
        pointsToNextTier: 200,
      }

      mockFetch.mockRejectedValueOnce(error)
      mockFetch.mockResolvedValueOnce(mockSummary)

      const { fetchSummary, error: errorRef } = useLoyalty()

      // First call fails
      await fetchSummary()
      expect(errorRef.value).toBeInstanceOf(Error)

      // Second call succeeds
      await fetchSummary()
      expect(errorRef.value).toBeNull()
    })

    it('should handle 401 unauthorized error', async () => {
      const error = new Error('Unauthorized')
      mockFetch.mockRejectedValueOnce(error)

      const { fetchSummary, loading, error: errorRef } = useLoyalty()

      await fetchSummary()

      expect(errorRef.value).toBeInstanceOf(Error)
      expect(errorRef.value?.message).toBe('Unauthorized')
      expect(loading.value).toBe(false)
    })

    it('should handle 500 server error', async () => {
      const error = new Error('Internal server error')
      mockFetch.mockRejectedValueOnce(error)

      const { fetchTransactions, error: errorRef } = useLoyalty()

      await fetchTransactions()

      expect(errorRef.value).toBeInstanceOf(Error)
      expect(errorRef.value?.message).toBe('Internal server error')
    })
  })

  describe('Filter Parameter Forwarding - Validates Requirements 1.5, 3.2, 3.3', () => {
    it('should forward page parameter to API', async () => {
      const mockResponse: PaginatedPointsTransactionList = {
        count: 50,
        results: [],
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const { fetchTransactions } = useLoyalty()

      await fetchTransactions({ page: 2 })

      expect(mockFetch).toHaveBeenCalledWith('/api/loyalty/transactions', {
        method: 'GET',
        query: { page: 2 },
      })
    })

    it('should forward transactionType parameter to API', async () => {
      const mockResponse: PaginatedPointsTransactionList = {
        count: 10,
        results: [],
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const { fetchTransactions } = useLoyalty()

      await fetchTransactions({ transactionType: 'EARN' })

      expect(mockFetch).toHaveBeenCalledWith('/api/loyalty/transactions', {
        method: 'GET',
        query: { transaction_type: 'EARN' },
      })
    })

    it('should forward dateFrom parameter to API', async () => {
      const mockResponse: PaginatedPointsTransactionList = {
        count: 5,
        results: [],
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const { fetchTransactions } = useLoyalty()

      await fetchTransactions({ dateFrom: '2024-01-01' })

      expect(mockFetch).toHaveBeenCalledWith('/api/loyalty/transactions', {
        method: 'GET',
        query: { date_from: '2024-01-01' },
      })
    })

    it('should forward dateTo parameter to API', async () => {
      const mockResponse: PaginatedPointsTransactionList = {
        count: 5,
        results: [],
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const { fetchTransactions } = useLoyalty()

      await fetchTransactions({ dateTo: '2024-12-31' })

      expect(mockFetch).toHaveBeenCalledWith('/api/loyalty/transactions', {
        method: 'GET',
        query: { date_to: '2024-12-31' },
      })
    })

    it('should forward multiple filter parameters to API', async () => {
      const mockResponse: PaginatedPointsTransactionList = {
        count: 3,
        results: [],
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const { fetchTransactions } = useLoyalty()

      await fetchTransactions({
        page: 2,
        transactionType: 'REDEEM',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/loyalty/transactions', {
        method: 'GET',
        query: {
          page: 2,
          transaction_type: 'REDEEM',
          date_from: '2024-01-01',
          date_to: '2024-12-31',
        },
      })
    })

    it('should not include undefined parameters in query', async () => {
      const mockResponse: PaginatedPointsTransactionList = {
        count: 10,
        results: [],
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const { fetchTransactions } = useLoyalty()

      await fetchTransactions({ page: 1, transactionType: undefined })

      expect(mockFetch).toHaveBeenCalledWith('/api/loyalty/transactions', {
        method: 'GET',
        query: { page: 1 },
      })
    })

    it('should call API without query parameters when no filters provided', async () => {
      const mockResponse: PaginatedPointsTransactionList = {
        count: 20,
        results: [],
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const { fetchTransactions } = useLoyalty()

      await fetchTransactions()

      expect(mockFetch).toHaveBeenCalledWith('/api/loyalty/transactions', {
        method: 'GET',
        query: {},
      })
    })

    it('should handle all transaction types correctly', async () => {
      const mockResponse: PaginatedPointsTransactionList = {
        count: 1,
        results: [],
      }

      const transactionTypes = ['EARN', 'REDEEM', 'EXPIRE', 'ADJUST', 'BONUS']

      for (const type of transactionTypes) {
        mockFetch.mockResolvedValueOnce(mockResponse)

        const { fetchTransactions } = useLoyalty()
        await fetchTransactions({ transactionType: type })

        expect(mockFetch).toHaveBeenCalledWith('/api/loyalty/transactions', {
          method: 'GET',
          query: { transaction_type: type },
        })

        mockFetch.mockReset()
      }
    })

    it('should handle date range filter correctly', async () => {
      const mockResponse: PaginatedPointsTransactionList = {
        count: 5,
        results: [],
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const { fetchTransactions } = useLoyalty()

      await fetchTransactions({
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/loyalty/transactions', {
        method: 'GET',
        query: {
          date_from: '2024-01-01',
          date_to: '2024-01-31',
        },
      })
    })
  })

  describe('Successful API Calls', () => {
    it('should fetch summary successfully and update state', async () => {
      const mockSummary: LoyaltySummary = {
        pointsBalance: 250,
        totalXp: 1000,
        level: 10,
        tier: {
          id: 1,
          translations: {
            el: { name: 'Χρυσός', description: 'Χρυσή βαθμίδα' },
            en: { name: 'Gold', description: 'Gold tier' },
            de: { name: 'Gold', description: 'Gold-Stufe' },
          },
          requiredLevel: 10,
          pointsMultiplier: 1.5,
        },
        pointsToNextTier: 500,
      }
      mockFetch.mockResolvedValueOnce(mockSummary)

      const { fetchSummary, summary, loading, error } = useLoyalty()

      await fetchSummary()

      expect(summary.value).toEqual(mockSummary)
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should fetch transactions successfully and update state', async () => {
      const mockTransactions: PaginatedPointsTransactionList = {
        count: 2,
        results: [
          {
            id: 1,
            points: 50,
            transactionType: 'EARN',
            referenceOrder: 123,
            description: 'Purchase reward',
            createdAt: '2024-01-15T10:00:00Z',
          },
          {
            id: 2,
            points: -25,
            transactionType: 'REDEEM',
            referenceOrder: null,
            description: 'Points redeemed',
            createdAt: '2024-01-16T14:30:00Z',
          },
        ],
      }
      mockFetch.mockResolvedValueOnce(mockTransactions)

      const { fetchTransactions, transactions, loading, error } = useLoyalty()

      await fetchTransactions()

      expect(transactions.value).toEqual(mockTransactions)
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should redeem points successfully and update summary balance', async () => {
      const mockSummary: LoyaltySummary = {
        pointsBalance: 200,
        totalXp: 800,
        level: 8,
        tier: null,
        pointsToNextTier: 300,
      }
      const mockRedeemResponse: RedeemPointsResponse = {
        discountAmount: 10,
        currency: 'EUR',
        pointsRedeemed: 100,
        remainingBalance: 100,
      }

      mockFetch.mockResolvedValueOnce(mockSummary)
      mockFetch.mockResolvedValueOnce(mockRedeemResponse)

      const { fetchSummary, redeemPoints, summary } = useLoyalty()

      // First fetch summary
      await fetchSummary()
      expect(summary.value?.pointsBalance).toBe(200)

      // Then redeem points
      const result = await redeemPoints({ pointsAmount: 100, currency: 'EUR' })

      expect(result).toEqual(mockRedeemResponse)
      expect(summary.value?.pointsBalance).toBe(100) // Updated to remainingBalance
    })

    it('should fetch product points successfully', async () => {
      const mockProductPoints: ProductPoints = {
        productId: 456,
        potentialPoints: 75,
        tierMultiplierApplied: true,
      }
      mockFetch.mockResolvedValueOnce(mockProductPoints)

      const { fetchProductPoints } = useLoyalty()

      const result = await fetchProductPoints(456)

      expect(result).toEqual(mockProductPoints)
      expect(mockFetch).toHaveBeenCalledWith('/api/loyalty/product/456/points', {
        method: 'GET',
      })
    })
  })

  describe('Loading State Management', () => {
    it('should set loading true during fetchSummary and false after completion', async () => {
      const mockSummary: LoyaltySummary = {
        pointsBalance: 100,
        totalXp: 500,
        level: 5,
        tier: null,
        pointsToNextTier: 200,
      }

      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockFetch.mockReturnValueOnce(promise)

      const { fetchSummary, loading } = useLoyalty()

      const fetchPromise = fetchSummary()

      // Should be loading immediately after call
      expect(loading.value).toBe(true)

      // Resolve the promise
      resolvePromise!(mockSummary)
      await fetchPromise

      // Should not be loading after completion
      expect(loading.value).toBe(false)
    })

    it('should set loading false even when API call fails', async () => {
      const error = new Error('Network error')
      mockFetch.mockRejectedValueOnce(error)

      const { fetchSummary, loading } = useLoyalty()

      await fetchSummary()

      expect(loading.value).toBe(false)
    })
  })
})
