import { z } from 'zod'
import { FetchError } from 'ofetch'
import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

/**
 * The signed-in shopper's figures for the account band — orders placed,
 * points and tier, gift-card balance and business-account status — in
 * one request from the browser and four to Django, in parallel. (The
 * unseen-notification count is not here: the bell keeps it live, and
 * the account navigation reads the same key — `useUnseenNotificationsCount`.)
 *
 * A feature the store has switched off is not asked for: the tenant
 * payload says which are on (`features`, Django's effective state), and
 * asking anyway made Django log `feature_gate:refused` on every account
 * page, which pages the team (`GrooveShopFeatureGateRefused`, owner
 * review 2026-10-16). That part is `null`.
 *
 * A 404 from one that is asked for also means "nothing to show": the B2B
 * profile 404s for a shopper without one, and a feature switched off
 * within the tenant cache's lifetime answers 404 until it expires. Any
 * other failure fails the route.
 *
 * Never cached: per-user data.
 */
export default defineEventHandler(async (event): Promise<AccountSummary> => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  const backendFetch = useBackendFetch(event)
  const get = (path: string, query?: Record<string, string | number>) =>
    backendFetch(`${config.apiBaseUrl}${path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      query,
    })

  try {
    const [orders, loyalty, giftCards, business] = await Promise.all([
      get('/order/my_orders', { pageSize: 1 }).then(response => parseDataAs(response, zListMyOrdersResponse)),
      eventStoreFeature(event, 'loyalty')
        ? absentOn404(get('/loyalty/summary').then(response => parseDataAs(response, zGetLoyaltySummaryResponse)))
        : null,
      // `pagination=false`: every card, not the first page of them.
      eventStoreFeature(event, 'giftCards')
        ? absentOn404(get('/giftcard/mine', { pagination: 'false' }).then(response => parseDataAs(response, z.array(zGiftCard))))
        : null,
      eventStoreFeature(event, 'wholesale')
        ? absentOn404(get('/b2b/profile').then(response => parseDataAs(response, zGetB2bProfileResponse)))
        : null,
    ])

    const now = Date.now()
    return {
      ordersCount: orders.count,
      loyalty: loyalty && { pointsBalance: loyalty.pointsBalance, tier: loyalty.tier },
      giftCardBalance: giftCards && giftCards
        .filter(card => card.status === 'ACTIVE' && (card.expiresAt === null || Date.parse(card.expiresAt) > now))
        .reduce((sum, card) => sum + card.balance, 0),
      businessStatus: business?.status ?? null,
    }
  }
  catch (error) {
    return handleError(event, error)
  }
})

async function absentOn404<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request
  }
  catch (error) {
    if (error instanceof FetchError && error.statusCode === 404) return null
    throw error
  }
}
