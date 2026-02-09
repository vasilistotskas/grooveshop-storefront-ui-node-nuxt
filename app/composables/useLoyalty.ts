/**
 * Composable for loyalty points API interactions
 *
 * Uses Nuxt's useAsyncData for SSR-safe data fetching with automatic caching,
 * deduplication, and payload forwarding from server to client.
 *
 * Provides centralized access to loyalty summary, transactions, redemption,
 * product points preview, tiers list, and settings functionality.
 */
export const useLoyalty = () => {
  /**
   * Fetch loyalty system configuration settings
   *
   * Fetches all loyalty-related settings from the backend in parallel
   * and aggregates them into a single settings object.
   *
   * Uses useAsyncData for SSR support and automatic caching.
   */
  const fetchSettings = () => {
    return useAsyncData<LoyaltySettings>(
      'loyalty-settings',
      async () => {
        try {
          // Fetch all loyalty settings in parallel
          const [
            enabled,
            redemptionRatio,
            pointsFactor,
            tierMultiplierEnabled,
            expirationDays,
            bonusEnabled,
            bonusPoints,
            xpPerLevel,
          ] = await Promise.all([
            $fetch<{ name: string, value: string }>('/api/settings/get', {
              query: { key: 'LOYALTY_ENABLED' },
            }).catch(() => ({ name: 'LOYALTY_ENABLED', value: 'false' })),
            $fetch<{ name: string, value: string }>('/api/settings/get', {
              query: { key: 'LOYALTY_REDEMPTION_RATIO_EUR' },
            }).catch(() => ({ name: 'LOYALTY_REDEMPTION_RATIO_EUR', value: '100' })),
            $fetch<{ name: string, value: string }>('/api/settings/get', {
              query: { key: 'LOYALTY_POINTS_FACTOR' },
            }).catch(() => ({ name: 'LOYALTY_POINTS_FACTOR', value: '1.0' })),
            $fetch<{ name: string, value: string }>('/api/settings/get', {
              query: { key: 'LOYALTY_TIER_MULTIPLIER_ENABLED' },
            }).catch(() => ({ name: 'LOYALTY_TIER_MULTIPLIER_ENABLED', value: 'false' })),
            $fetch<{ name: string, value: string }>('/api/settings/get', {
              query: { key: 'LOYALTY_POINTS_EXPIRATION_DAYS' },
            }).catch(() => ({ name: 'LOYALTY_POINTS_EXPIRATION_DAYS', value: '0' })),
            $fetch<{ name: string, value: string }>('/api/settings/get', {
              query: { key: 'LOYALTY_NEW_CUSTOMER_BONUS_ENABLED' },
            }).catch(() => ({ name: 'LOYALTY_NEW_CUSTOMER_BONUS_ENABLED', value: 'false' })),
            $fetch<{ name: string, value: string }>('/api/settings/get', {
              query: { key: 'LOYALTY_NEW_CUSTOMER_BONUS_POINTS' },
            }).catch(() => ({ name: 'LOYALTY_NEW_CUSTOMER_BONUS_POINTS', value: '0' })),
            $fetch<{ name: string, value: string }>('/api/settings/get', {
              query: { key: 'LOYALTY_XP_PER_LEVEL' },
            }).catch(() => ({ name: 'LOYALTY_XP_PER_LEVEL', value: '1000' })),
          ])

          // Parse and aggregate settings
          return {
            enabled: enabled.value.toLowerCase() === 'true',
            redemptionRatioEur: Number.parseFloat(redemptionRatio.value),
            pointsFactor: Number.parseFloat(pointsFactor.value),
            tierMultiplierEnabled: tierMultiplierEnabled.value.toLowerCase() === 'true',
            pointsExpirationDays: Number.parseInt(expirationDays.value, 10),
            newCustomerBonusEnabled: bonusEnabled.value.toLowerCase() === 'true',
            newCustomerBonusPoints: Number.parseInt(bonusPoints.value, 10),
            xpPerLevel: Number.parseInt(xpPerLevel.value, 10),
          }
        }
        catch (err) {
          console.error('Failed to fetch loyalty settings:', err)
          // Return default values on error
          return {
            enabled: false,
            redemptionRatioEur: 100,
            pointsFactor: 1.0,
            tierMultiplierEnabled: false,
            pointsExpirationDays: 0,
            newCustomerBonusEnabled: false,
            newCustomerBonusPoints: 0,
            xpPerLevel: 1000,
          }
        }
      },
    )
  }

  /**
   * Fetch the user's loyalty summary (balance, level, tier, XP progress)
   *
   * Uses useAsyncData for SSR support and automatic caching.
   */
  const fetchSummary = () => {
    return useAsyncData<LoyaltySummary>(
      'loyalty-summary',
      () => $fetch<LoyaltySummary>('/api/loyalty/summary', {
        method: 'GET',
        headers: useRequestHeaders(),
      }),
    )
  }

  /**
   * Fetch the user's loyalty transaction history with optional filters
   *
   * Uses useAsyncData with dynamic key based on filter parameters for proper caching.
   *
   * @param params - Optional filter parameters
   * @param params.page - Page number for pagination
   * @param params.transactionType - Filter by transaction type (EARN, REDEEM, EXPIRE, ADJUST, BONUS)
   * @param params.dateFrom - Filter transactions from this date (ISO format)
   * @param params.dateTo - Filter transactions to this date (ISO format)
   */
  const fetchTransactions = (params?: {
    page?: number
    transactionType?: string
    dateFrom?: string
    dateTo?: string
  }) => {
    // Build query parameters, only including defined values
    const query: Record<string, string | number> = {}

    if (params?.page !== undefined) {
      query.page = params.page
    }
    if (params?.transactionType !== undefined) {
      query.transaction_type = params.transactionType
    }
    if (params?.dateFrom !== undefined) {
      query.date_from = params.dateFrom
    }
    if (params?.dateTo !== undefined) {
      query.date_to = params.dateTo
    }

    // Create unique cache key based on parameters
    const cacheKey = `loyalty-transactions-${JSON.stringify(params || {})}`

    return useAsyncData<PaginatedPointsTransactionList>(
      cacheKey,
      () => $fetch<PaginatedPointsTransactionList>('/api/loyalty/transactions', {
        method: 'GET',
        headers: useRequestHeaders(),
        query,
      }),
    )
  }

  /**
   * Redeem loyalty points for a monetary discount
   *
   * This is a mutation operation (POST), so it doesn't use useAsyncData.
   * After successful redemption, you should call refresh() on the summary data.
   *
   * @param body - Redemption request
   * @param body.pointsAmount - Number of points to redeem
   * @param body.currency - Currency for the discount (e.g., "EUR")
   * @returns Redemption response with discount amount and remaining balance
   */
  const redeemPoints = async (body: {
    pointsAmount: number
    currency: string
  }): Promise<RedeemPointsResponse> => {
    try {
      const data = await $fetch<RedeemPointsResponse>('/api/loyalty/redeem', {
        method: 'POST',
        body,
      })

      // Refresh the summary cache after successful redemption
      await refreshNuxtData('loyalty-summary')

      return data
    }
    catch (err) {
      console.error('Failed to redeem loyalty points:', err)
      throw err
    }
  }

  /**
   * Fetch potential loyalty points for a specific product
   *
   * Uses useAsyncData with product-specific cache key.
   * Errors are logged but don't throw (silent failure for non-critical feature).
   *
   * @param productId - The product ID
   */
  const fetchProductPoints = (productId: number) => {
    return useAsyncData<ProductPoints>(
      `loyalty-product-points-${productId}`,
      async () => {
        try {
          return await $fetch<ProductPoints>(`/api/loyalty/product/${productId}/points`, {
            method: 'GET',
            headers: useRequestHeaders(),
          })
        }
        catch (err) {
          // Silent failure for product points badge (non-critical feature)
          console.error('Failed to fetch product points:', err)
          throw err // Re-throw so useAsyncData can handle it
        }
      },
    )
  }

  /**
   * Fetch all loyalty tiers
   *
   * Uses useAsyncData for SSR support and automatic caching.
   */
  const fetchTiers = () => {
    return useAsyncData<LoyaltyTier[]>(
      'loyalty-tiers',
      () => $fetch<LoyaltyTier[]>('/api/loyalty/tiers', {
        method: 'GET',
        headers: useRequestHeaders(),
      }),
    )
  }

  return {
    // Data fetching methods (return useAsyncData results)
    fetchSummary,
    fetchTransactions,
    fetchSettings,
    fetchTiers,
    fetchProductPoints,

    // Mutation method
    redeemPoints,
  }
}
