/**
 * Loyalty system configuration settings
 *
 * These settings control the behavior of the loyalty points system
 * and are fetched from the backend Django extra_settings.
 */
export interface LoyaltySettings {
  /** Whether the loyalty system is enabled */
  enabled: boolean

  /** Points needed per 1 EUR discount (e.g., 100 points = 1 EUR) */
  redemptionRatioEur: number

  /** Points earned per 1 EUR spent (e.g., 1.0 = 1 point per EUR) */
  pointsFactor: number

  /** Whether tier-based point multipliers are enabled */
  tierMultiplierEnabled: boolean

  /** Days until points expire (0 = never expire) */
  pointsExpirationDays: number

  /** Whether new customer bonus is enabled */
  newCustomerBonusEnabled: boolean

  /** Bonus points awarded to new customers on first order */
  newCustomerBonusPoints: number

  /** XP needed per level (e.g., 1000 XP = 1 level) */
  xpPerLevel: number
}
