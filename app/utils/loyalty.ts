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
