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
  const LOYALTY_SETTING_KEYS = [
    'LOYALTY_ENABLED',
    'LOYALTY_REDEMPTION_RATIO_EUR',
    'LOYALTY_POINTS_FACTOR',
    'LOYALTY_TIER_MULTIPLIER_ENABLED',
    'LOYALTY_POINTS_EXPIRATION_DAYS',
    'LOYALTY_NEW_CUSTOMER_BONUS_ENABLED',
    'LOYALTY_NEW_CUSTOMER_BONUS_POINTS',
    'LOYALTY_XP_PER_LEVEL',
  ] as const

  const fetchSettings = () => {
    return useAsyncData<LoyaltySettings>(
      'loyalty-settings',
      async () => {
        try {
          const settings = await $fetch<Record<string, string>>('/api/loyalty/settings', {
            query: { keys: LOYALTY_SETTING_KEYS.join(',') },
          })

          return {
            enabled: (settings['LOYALTY_ENABLED'] ?? 'false').toLowerCase() === 'true',
            redemptionRatioEur: Number.parseFloat(settings['LOYALTY_REDEMPTION_RATIO_EUR'] ?? '100'),
            pointsFactor: Number.parseFloat(settings['LOYALTY_POINTS_FACTOR'] ?? '1.0'),
            tierMultiplierEnabled: (settings['LOYALTY_TIER_MULTIPLIER_ENABLED'] ?? 'false').toLowerCase() === 'true',
            pointsExpirationDays: Number.parseInt(settings['LOYALTY_POINTS_EXPIRATION_DAYS'] ?? '0', 10),
            newCustomerBonusEnabled: (settings['LOYALTY_NEW_CUSTOMER_BONUS_ENABLED'] ?? 'false').toLowerCase() === 'true',
            newCustomerBonusPoints: Number.parseInt(settings['LOYALTY_NEW_CUSTOMER_BONUS_POINTS'] ?? '0', 10),
            xpPerLevel: Number.parseInt(settings['LOYALTY_XP_PER_LEVEL'] ?? '1000', 10),
          }
        }
        catch (err) {
          log.error({ action: 'loyalty:fetchSettings', error: err })
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
   * Accepts a reactive ref/computed/getter so filters and pagination
   * automatically trigger a re-fetch via useAsyncData's watch option.
   *
   * @param params - Optional reactive filter parameters
   * @param params.page - Page number for pagination
   * @param params.transactionType - Filter by transaction type (EARN, REDEEM, EXPIRE, ADJUST, BONUS)
   * @param params.dateFrom - Filter transactions from this date (ISO format)
   * @param params.dateTo - Filter transactions to this date (ISO format)
   */
  const fetchTransactions = (params?: MaybeRefOrGetter<{
    page?: number
    transactionType?: string
    dateFrom?: string
    dateTo?: string
  }>) => {
    return useAsyncData<PaginatedPointsTransactionList>(
      'loyalty-transactions',
      () => {
        // Resolve reactive params inside the fetch function so each
        // execution reads the latest values
        const resolved = toValue(params)
        const query: Record<string, string | number> = {}

        if (resolved?.page !== undefined) {
          query.page = resolved.page
        }
        if (resolved?.transactionType !== undefined) {
          query.transaction_type = resolved.transactionType
        }
        if (resolved?.dateFrom !== undefined) {
          query.created_after = resolved.dateFrom
        }
        if (resolved?.dateTo !== undefined) {
          query.created_before = resolved.dateTo
        }

        return $fetch<PaginatedPointsTransactionList>('/api/loyalty/transactions', {
          method: 'GET',
          headers: useRequestHeaders(),
          query,
        })
      },
      {
        watch: [() => toValue(params)],
      },
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
      log.error({ action: 'loyalty:redeem', error: err })
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
      () => $fetch<ProductPoints>(`/api/loyalty/product/${productId}/points`, {
        method: 'GET',
        headers: useRequestHeaders(),
      }),
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
