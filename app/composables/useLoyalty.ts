/**
 * Composable for loyalty points API interactions
 *
 * Uses Nuxt's useAsyncData for SSR-safe data fetching with automatic caching,
 * deduplication, and payload forwarding from server to client.
 *
 * Provides centralized access to loyalty summary, transactions, redemption,
 * product points preview, tiers list, and settings functionality.
 *
 * Nothing is requested on a store without the `loyalty` feature: every
 * fetch here passes it as `enabled`, so a caller that renders behind its
 * own gate (or forgets one) can never ask. Django refuses a store's
 * loyalty API with the feature off (`feature_gate:refused`, which pages
 * the team), and the data is `undefined`, as every reader already
 * treats an unconfigured programme.
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
  const loyaltyOn = useStoreFeature('loyalty')

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
      { dedupe: 'defer', enabled: loyaltyOn },
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
      { enabled: loyaltyOn },
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
        enabled: loyaltyOn,
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
   * @param enabled - The caller's own condition (a signed-in shopper),
   *   on top of the store's loyalty feature
   */
  const fetchProductPoints = (productId: number, enabled: MaybeRefOrGetter<boolean>) => {
    const ask = () => loyaltyOn.value && toValue(enabled)
    return useAsyncData<ProductPoints>(
      `loyalty-product-points-${productId}`,
      () => requestFetch<ProductPoints>(`/api/loyalty/product/${productId}/points`, {
        method: 'GET',
      }),
      // `enabled` blocks a fetch but never starts one when it turns
      // true; the watch does.
      { enabled: ask, watch: [ask] },
    )
  }

  /**
   * The points each product earns the signed-in shopper, asked in
   * parallel: the cart's total follows its lines as they change, so this
   * is a plain request rather than keyed async data. A product whose
   * points cannot be read counts 0 (non-critical).
   *
   * @param productIds - Distinct product ids
   */
  const fetchPointsPerProduct = async (productIds: readonly number[]): Promise<Map<number, number>> => {
    if (!loyaltyOn.value) return new Map()

    const entries = await Promise.all(productIds.map(async (productId): Promise<[number, number]> => {
      try {
        const data = await requestFetch<ProductPoints>(`/api/loyalty/product/${productId}/points`, {
          method: 'GET',
        })
        return [productId, data.potentialPoints]
      }
      catch {
        return [productId, 0]
      }
    }))
    return new Map(entries)
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
      { enabled: loyaltyOn },
    )
  }

  return {
    // Data fetching methods (return useAsyncData results)
    fetchSummary,
    fetchTransactions,
    fetchSettings,
    fetchTiers,
    fetchProductPoints,
    fetchPointsPerProduct,
  }
}
