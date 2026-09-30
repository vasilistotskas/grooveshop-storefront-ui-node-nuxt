import type {
  LoyaltySummary,
  LoyaltyTier,
  PaginatedPointsTransactionList,
  PointsTransaction,
  ProductPoints,
} from '~~/shared/openapi/types.gen'
import type { LoyaltySettings } from '~~/shared/types/LoyaltySettings'
import { FIXTURE_TIMESTAMP } from './product'

/**
 * A `LoyaltyTier` as Django serialises it, valid against the generated
 * `zLoyaltyTier` (proved by `test/unit/fixtures/loyalty.spec.ts`).
 *
 * Defaults: id 1, "Χάλκινο" / "Bronze" from level 1 with no multiplier
 * (`pointsMultiplier: 1`), no icon.
 */
export function makeTier(overrides: Partial<LoyaltyTier> = {}): LoyaltyTier {
  return {
    id: 1,
    translations: {
      el: { name: 'Χάλκινο', description: 'Η πρώτη βαθμίδα' },
      en: { name: 'Bronze', description: 'The first tier' },
    },
    requiredLevel: 1,
    pointsMultiplier: 1,
    icon: null,
    mainImagePath: '',
    iconFilename: '',
    ...overrides,
  }
}

/**
 * The `/api/loyalty/summary` payload, valid against `zLoyaltySummary`.
 *
 * Defaults: 1500 points, level 2 on 1500 XP, no tier yet, 500 XP to the
 * next tier.
 */
export function makeSummary(overrides: Partial<LoyaltySummary> = {}): LoyaltySummary {
  return {
    pointsBalance: 1500,
    totalXp: 1500,
    level: 2,
    tier: null,
    pointsToNextTier: 500,
    ...overrides,
  }
}

/**
 * One `PointsTransaction`, valid against `zPointsTransaction`.
 *
 * Defaults: id 1, +100 points EARNed on order 1001, at
 * `FIXTURE_TIMESTAMP`.
 */
export function makeTransaction(overrides: Partial<PointsTransaction> = {}): PointsTransaction {
  return {
    id: 1,
    points: 100,
    transactionType: 'EARN',
    referenceOrder: 1001,
    description: 'Πόντοι από την παραγγελία #1001',
    createdAt: FIXTURE_TIMESTAMP,
    ...overrides,
  }
}

/**
 * A page of the `/api/loyalty/transactions` list, valid against
 * `zPaginatedPointsTransactionList`. `results` are `makeTransaction`
 * overrides; `count` defaults to their number and `totalPages` to one
 * page of `pageSize` (12, Django's default for this list).
 */
export function makeTransactionPage(
  results: Partial<PointsTransaction>[] = [{}],
  overrides: Partial<Omit<PaginatedPointsTransactionList, 'results'>> = {},
): PaginatedPointsTransactionList {
  const rows = results.map((row, index) => makeTransaction({ id: index + 1, ...row }))
  const pageSize = overrides.pageSize ?? 12
  const count = overrides.count ?? rows.length
  return {
    links: { next: null, previous: null },
    count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
    pageSize,
    pageTotalResults: rows.length,
    page: 1,
    results: rows,
    ...overrides,
  }
}

/**
 * The `/api/loyalty/product/:id/points` preview, valid against
 * `zProductPoints`. Defaults: product 1, 24 points, no tier multiplier.
 */
export function makeProductPoints(overrides: Partial<ProductPoints> = {}): ProductPoints {
  return {
    productId: 1,
    potentialPoints: 24,
    tierMultiplierApplied: false,
    ...overrides,
  }
}

/**
 * What `useLoyalty().fetchSettings()` resolves to — the storefront's
 * own `LoyaltySettings` (`shared/types/LoyaltySettings.ts`), aggregated
 * from Django's extra_settings, so there is no generated schema to
 * parse it against; the interface is the contract.
 *
 * Defaults: enabled, 100 points per euro, the values `useLoyalty`
 * falls back to for every other key.
 */
export function makeLoyaltySettings(overrides: Partial<LoyaltySettings> = {}): LoyaltySettings {
  return {
    enabled: true,
    redemptionRatioEur: 100,
    pointsFactor: 1,
    tierMultiplierEnabled: false,
    pointsExpirationDays: 0,
    newCustomerBonusEnabled: false,
    newCustomerBonusPoints: 0,
    xpPerLevel: 1000,
    ...overrides,
  }
}
