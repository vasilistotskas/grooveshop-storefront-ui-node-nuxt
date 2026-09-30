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
  // Forwards the browser cookie during SSR so internal calls to our own
  // /api/loyalty/* routes inherit the encrypted nuxt-session cookie —
  // without it they land anonymously, ``requireAllAuthAccessToken``
  // returns nothing and Django replies 401.
  // useRequestFetch instead of a bare $fetch with hand-picked headers:
  // it forwards the incoming HOST as well as the cookie during SSR.
  // Selecting only 'cookie' kept the auth working but dropped the host,
  // so Nitro stamped host: "localhost" on the internal request and
  // server/middleware/0.tenant.ts answered 404 "Store not found" —
  // silently, because every caller falls back to a default. It still
  // omits the headers that would break Nuxt's payload-cache hash
  // (range, if-none-match) and the hop-by-hop ones.
  const requestFetch = useRequestApi()

  /**
   * Fetch loyalty system configuration settings
   *
   * Fetches all loyalty-related settings from the backend in one request
   * and parses them into a single settings object (`parseLoyaltySettings`).
   *
   * Uses useAsyncData for SSR support and automatic caching.
   */
  const fetchSettings = () => {
    return useAsyncData<LoyaltySettings>(
      'loyalty-settings',
      async () => {
        try {
          const settings = await requestFetch<Record<string, string>>('/api/loyalty/settings', {
            query: { keys: LOYALTY_SETTING_KEYS.join(',') },
          })
          return parseLoyaltySettings(settings)
        }
        catch (err) {
          log.error({ action: 'loyalty:fetchSettings', error: err })
          return defaultLoyaltySettings()
        }
      },
      // Read by the navbar badge, the account menu, the product and
      // checkout CTAs in one render: 'defer' lets the later readers
      // wait on the pending request instead of re-issuing it (the
      // default 'cancel'). See useStoreSettings.
      { dedupe: 'defer' },
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
      () => requestFetch<LoyaltySummary>('/api/loyalty/summary', {
        method: 'GET',
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
  const fetchTransactions = (params?: MaybeRefOrGetter<LoyaltyTransactionsParams>) => {
    return useAsyncData<PaginatedPointsTransactionList>(
      'loyalty-transactions',
      // Resolve reactive params inside the fetch function so each
      // execution reads the latest values
      () => requestFetch<PaginatedPointsTransactionList>('/api/loyalty/transactions', {
        method: 'GET',
        query: buildLoyaltyTransactionsQuery(toValue(params)),
      }),
      {
        watch: [() => toValue(params)],
      },
    )
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
      () => requestFetch<ProductPoints>(`/api/loyalty/product/${productId}/points`, {
        method: 'GET',
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
      () => requestFetch<LoyaltyTier[]>('/api/loyalty/tiers', {
        method: 'GET',
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
  }
}
