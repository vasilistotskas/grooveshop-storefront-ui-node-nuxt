/**
 * Composable for loyalty points API interactions
 *
 * Provides centralized access to loyalty summary, transactions, redemption,
 * product points preview, tiers list, and settings functionality.
 */
export const useLoyalty = () => {
  // Reactive state
  const summary = ref<LoyaltySummary | null>(null)
  const transactions = ref<PaginatedPointsTransactionList | null>(null)
  const settings = ref<LoyaltySettings | null>(null)
  const tiers = ref<LoyaltyTier[] | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Fetch loyalty system configuration settings
   *
   * Fetches all loyalty-related settings from the backend in parallel
   * and aggregates them into a single settings object.
   */
  async function fetchSettings(): Promise<void> {
    loading.value = true
    error.value = null

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
      settings.value = {
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
      error.value = err as Error
      console.error('Failed to fetch loyalty settings:', err)
      // Set default values on error
      settings.value = {
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
    finally {
      loading.value = false
    }
  }

  /**
   * Fetch the user's loyalty summary (balance, level, tier, XP progress)
   */
  async function fetchSummary(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<LoyaltySummary>('/api/loyalty/summary', {
        method: 'GET',
      })
      summary.value = data
    }
    catch (err) {
      error.value = err as Error
      console.error('Failed to fetch loyalty summary:', err)
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Fetch the user's loyalty transaction history with optional filters
   *
   * @param params - Optional filter parameters
   * @param params.page - Page number for pagination
   * @param params.transactionType - Filter by transaction type (EARN, REDEEM, EXPIRE, ADJUST, BONUS)
   * @param params.dateFrom - Filter transactions from this date (ISO format)
   * @param params.dateTo - Filter transactions to this date (ISO format)
   */
  async function fetchTransactions(params?: {
    page?: number
    transactionType?: string
    dateFrom?: string
    dateTo?: string
  }): Promise<void> {
    loading.value = true
    error.value = null

    try {
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

      const data = await $fetch<PaginatedPointsTransactionList>('/api/loyalty/transactions', {
        method: 'GET',
        query,
      })
      transactions.value = data
    }
    catch (err) {
      error.value = err as Error
      console.error('Failed to fetch loyalty transactions:', err)
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Redeem loyalty points for a monetary discount
   *
   * @param body - Redemption request
   * @param body.pointsAmount - Number of points to redeem
   * @param body.currency - Currency for the discount (e.g., "EUR")
   * @returns Redemption response with discount amount and remaining balance
   */
  async function redeemPoints(body: {
    pointsAmount: number
    currency: string
  }): Promise<RedeemPointsResponse> {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<RedeemPointsResponse>('/api/loyalty/redeem', {
        method: 'POST',
        body,
      })

      // Update the summary balance after successful redemption
      if (summary.value) {
        summary.value = {
          ...summary.value,
          pointsBalance: data.remainingBalance,
        }
      }

      return data
    }
    catch (err) {
      error.value = err as Error
      console.error('Failed to redeem loyalty points:', err)
      throw err
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Fetch potential loyalty points for a specific product
   *
   * @param productId - The product ID
   * @returns Product points data or null on error (silent failure)
   */
  async function fetchProductPoints(productId: number): Promise<ProductPoints | null> {
    try {
      const data = await $fetch<ProductPoints>(`/api/loyalty/product/${productId}/points`, {
        method: 'GET',
      })
      return data
    }
    catch (err) {
      // Silent failure for product points badge
      console.error('Failed to fetch product points:', err)
      return null
    }
  }

  /**
   * Fetch all loyalty tiers
   */
  async function fetchTiers(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<LoyaltyTier[]>('/api/loyalty/tiers', {
        method: 'GET',
      })
      tiers.value = data
    }
    catch (err) {
      error.value = err as Error
      console.error('Failed to fetch loyalty tiers:', err)
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Computed property for easy access to loyalty enabled status
   * Extracts the enabled flag from settings for convenience
   */
  const loyaltyEnabled = computed(() => settings.value?.enabled ?? false)

  return {
    // State
    summary,
    transactions,
    settings,
    tiers,
    loading,
    error,

    // Computed
    loyaltyEnabled,

    // Methods
    fetchSummary,
    fetchTransactions,
    redeemPoints,
    fetchProductPoints,
    fetchSettings,
    fetchTiers,
  }
}
