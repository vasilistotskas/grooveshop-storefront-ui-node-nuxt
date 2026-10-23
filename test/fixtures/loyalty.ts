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
 * The storefront's own `LoyaltySettings` (`shared/types/LoyaltySettings.ts`),
 * which `useLoyaltySettings` parses from the public settings payload, so
 * there is no generated schema to parse it against; the interface is the
 * contract. `makeLoyaltyPublicSettings` is the same figures as that
 * payload carries them.
 *
 * Defaults: 100 points per euro, 1 point per euro earned, no expiry, no
 * bonus, no tier multipliers, 1000 XP per level.
 */
export function makeLoyaltySettings(overrides: Partial<LoyaltySettings> = {}): LoyaltySettings {
  return {
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

/**
 * The loyalty keys of Django's `/settings/public` map, as it sends them
 * (every value a string): the figures `makeLoyaltySettings` has, plus the
 * programme switch `LOYALTY_ENABLED`, which is a store feature and never
 * read from here.
 */
export function makeLoyaltyPublicSettings(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    LOYALTY_ENABLED: 'true',
    LOYALTY_REDEMPTION_RATIO_EUR: '100',
    LOYALTY_POINTS_FACTOR: '1.0',
    LOYALTY_TIER_MULTIPLIER_ENABLED: 'False',
    LOYALTY_POINTS_EXPIRATION_DAYS: '0',
    LOYALTY_NEW_CUSTOMER_BONUS_ENABLED: 'False',
    LOYALTY_NEW_CUSTOMER_BONUS_POINTS: '0',
    LOYALTY_XP_PER_LEVEL: '1000',
    ...overrides,
  }
}
