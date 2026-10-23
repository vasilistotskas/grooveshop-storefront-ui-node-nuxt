/**
 * The typed loyalty settings from the store's public settings payload
 * (`useStoreSettings`), or `null` when any of them cannot be read.
 *
 * Django sends every public key with the store's value or the one it
 * declares, so an absent or unparseable key means the lookup failed, and
 * no number is guessed in its place: the caller renders nothing for a
 * figure it does not know. Whether the programme is on is a store
 * feature (`useStoreFeature('loyalty')`), not a field here.
 */
export function parseLoyaltySettings(settings: Readonly<Record<string, string>>): LoyaltySettings | null {
  const number = (key: string) => {
    const raw = settings[key]?.trim()
    return raw ? Number(raw) : Number.NaN
  }
  const flag = (key: string) => {
    const raw = settings[key]
    return raw === undefined ? null : parseSettingFlag(raw, false)
  }

  const redemptionRatioEur = number('LOYALTY_REDEMPTION_RATIO_EUR')
  const pointsFactor = number('LOYALTY_POINTS_FACTOR')
  const pointsExpirationDays = number('LOYALTY_POINTS_EXPIRATION_DAYS')
  const newCustomerBonusPoints = number('LOYALTY_NEW_CUSTOMER_BONUS_POINTS')
  const xpPerLevel = number('LOYALTY_XP_PER_LEVEL')
  const tierMultiplierEnabled = flag('LOYALTY_TIER_MULTIPLIER_ENABLED')
  const newCustomerBonusEnabled = flag('LOYALTY_NEW_CUSTOMER_BONUS_ENABLED')

  if (
    !Number.isFinite(redemptionRatioEur)
    || !Number.isFinite(pointsFactor)
    || !Number.isInteger(pointsExpirationDays)
    || !Number.isInteger(newCustomerBonusPoints)
    || !Number.isInteger(xpPerLevel)
    || tierMultiplierEnabled === null
    || newCustomerBonusEnabled === null
  ) {
    return null
  }

  return {
    redemptionRatioEur,
    pointsFactor,
    tierMultiplierEnabled,
    pointsExpirationDays,
    newCustomerBonusEnabled,
    newCustomerBonusPoints,
    xpPerLevel,
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

/**
 * The XP a tier starts at. Tiers are XP levels and level 1 starts at
 * 0 XP, so a tier that needs level N starts at `(N − 1) × xpPerLevel`.
 */
export function tierStartXp(tier: Pick<LoyaltyTier, 'requiredLevel'>, xpPerLevel: number): number {
  return (tier.requiredLevel - 1) * xpPerLevel
}

/**
 * How far `totalXp` is from one tier's start to the next's, 0–100.
 */
export function tierProgress(totalXp: number, fromXp: number, toXp: number): number {
  if (toXp <= fromXp) return 100
  return Math.min(100, Math.max(0, ((totalXp - fromXp) / (toXp - fromXp)) * 100))
}
