/** The site settings `useLoyalty().fetchSettings` asks `/api/loyalty/settings` for. */
export const LOYALTY_SETTING_KEYS = [
  'LOYALTY_ENABLED',
  'LOYALTY_REDEMPTION_RATIO_EUR',
  'LOYALTY_POINTS_FACTOR',
  'LOYALTY_TIER_MULTIPLIER_ENABLED',
  'LOYALTY_POINTS_EXPIRATION_DAYS',
  'LOYALTY_NEW_CUSTOMER_BONUS_ENABLED',
  'LOYALTY_NEW_CUSTOMER_BONUS_POINTS',
  'LOYALTY_XP_PER_LEVEL',
] as const

/** What the storefront assumes when a loyalty setting is missing or unreadable. */
export function defaultLoyaltySettings(): LoyaltySettings {
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

/**
 * The typed loyalty settings from the settings endpoint's key → string map.
 *
 * The endpoint returns `value: ''` (not undefined) for a key whose Django
 * fetch failed, so `?? default` never fires and a bare parseFloat/parseInt
 * would yield NaN and poison checkout's redemption math. Guard on
 * Number.isFinite so empty/missing/bad values all fall back to the default.
 */
export function parseLoyaltySettings(settings: Record<string, string | undefined>): LoyaltySettings {
  const defaults = defaultLoyaltySettings()
  const num = (v: string | undefined, fallback: number) => {
    const n = Number.parseFloat(v ?? '')
    return Number.isFinite(n) ? n : fallback
  }
  const int = (v: string | undefined, fallback: number) => {
    const n = Number.parseInt(v ?? '', 10)
    return Number.isFinite(n) ? n : fallback
  }
  // The one truthiness rule every merchant flag follows; an absent or
  // empty row is off, as the defaults are.
  const bool = (v: string | undefined) => parseSettingFlag(v, false)

  return {
    enabled: bool(settings['LOYALTY_ENABLED']),
    redemptionRatioEur: num(settings['LOYALTY_REDEMPTION_RATIO_EUR'], defaults.redemptionRatioEur),
    pointsFactor: num(settings['LOYALTY_POINTS_FACTOR'], defaults.pointsFactor),
    tierMultiplierEnabled: bool(settings['LOYALTY_TIER_MULTIPLIER_ENABLED']),
    pointsExpirationDays: int(settings['LOYALTY_POINTS_EXPIRATION_DAYS'], defaults.pointsExpirationDays),
    newCustomerBonusEnabled: bool(settings['LOYALTY_NEW_CUSTOMER_BONUS_ENABLED']),
    newCustomerBonusPoints: int(settings['LOYALTY_NEW_CUSTOMER_BONUS_POINTS'], defaults.newCustomerBonusPoints),
    xpPerLevel: int(settings['LOYALTY_XP_PER_LEVEL'], defaults.xpPerLevel),
  }
}

/** The transaction-history filters `useLoyalty().fetchTransactions` accepts. */
export interface LoyaltyTransactionsParams {
  page?: number
  transactionType?: string
  dateFrom?: string
  dateTo?: string
}

/** The `/api/loyalty/transactions` query for `params`, in Django's filter names; unset filters are left out. */
export function buildLoyaltyTransactionsQuery(params: LoyaltyTransactionsParams | undefined) {
  const query: Record<string, string | number> = {}

  if (params?.page !== undefined) {
    query.page = params.page
  }
  if (params?.transactionType !== undefined) {
    query.transaction_type = params.transactionType
  }
  if (params?.dateFrom !== undefined) {
    query.created_after = params.dateFrom
  }
  if (params?.dateTo !== undefined) {
    query.created_before = params.dateTo
  }

  return query
}
