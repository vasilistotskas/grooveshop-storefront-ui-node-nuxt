import { describe, it, expect } from 'vitest'
import {
  buildLoyaltyTransactionsQuery,
  parseLoyaltySettings,
  tierProgress,
  tierStartXp,
} from '~/utils/loyalty'
import { makeLoyaltyPublicSettings } from '~~/test/fixtures/loyalty'

/** Every setting present and valid, as a correctly configured tenant returns them. */
const CONFIGURED = makeLoyaltyPublicSettings({
  LOYALTY_REDEMPTION_RATIO_EUR: '50.5',
  LOYALTY_POINTS_FACTOR: '1.5',
  LOYALTY_TIER_MULTIPLIER_ENABLED: 'True',
  LOYALTY_POINTS_EXPIRATION_DAYS: '365',
  LOYALTY_NEW_CUSTOMER_BONUS_ENABLED: 'TRUE',
  LOYALTY_NEW_CUSTOMER_BONUS_POINTS: '200',
  LOYALTY_XP_PER_LEVEL: '2500',
})

const NUMERIC_KEYS = [
  'LOYALTY_REDEMPTION_RATIO_EUR',
  'LOYALTY_POINTS_FACTOR',
  'LOYALTY_POINTS_EXPIRATION_DAYS',
  'LOYALTY_NEW_CUSTOMER_BONUS_POINTS',
  'LOYALTY_XP_PER_LEVEL',
] as const
const FLAG_KEYS = ['LOYALTY_TIER_MULTIPLIER_ENABLED', 'LOYALTY_NEW_CUSTOMER_BONUS_ENABLED'] as const

describe('parseLoyaltySettings', () => {
  it('reads every configured setting, booleans case-insensitively', () => {
    expect(parseLoyaltySettings(CONFIGURED)).toEqual({
      redemptionRatioEur: 50.5,
      pointsFactor: 1.5,
      tierMultiplierEnabled: true,
      pointsExpirationDays: 365,
      newCustomerBonusEnabled: true,
      newCustomerBonusPoints: 200,
      xpPerLevel: 2500,
    })
  })

  it('ignores the keys of the rest of the payload, the programme switch included', () => {
    expect(parseLoyaltySettings({ ...CONFIGURED, LOYALTY_ENABLED: 'false', CART_ENABLED: 'true' })).toEqual(parseLoyaltySettings(CONFIGURED))
  })

  it('answers null, not defaults, for an empty payload', () => {
    expect(parseLoyaltySettings({})).toBeNull()
  })

  it.each([...NUMERIC_KEYS, ...FLAG_KEYS])('answers null when %s is missing', (key) => {
    const { [key]: _missing, ...rest } = CONFIGURED

    expect(parseLoyaltySettings(rest)).toBeNull()
  })

  // A number that cannot be read must never reach checkout's redemption
  // maths as NaN, nor as a guess.
  it.each(['', ' ', 'abc', 'NaN', 'Infinity', '12abc'])('answers null for a numeric setting set to %j', (bad) => {
    for (const key of NUMERIC_KEYS) {
      expect(parseLoyaltySettings({ ...CONFIGURED, [key]: bad }), key).toBeNull()
    }
  })

  it.each(['30.9', '1e2x'])('answers null for an integer setting that is not an integer: %j', (bad) => {
    for (const key of ['LOYALTY_POINTS_EXPIRATION_DAYS', 'LOYALTY_NEW_CUSTOMER_BONUS_POINTS', 'LOYALTY_XP_PER_LEVEL']) {
      expect(parseLoyaltySettings({ ...CONFIGURED, [key]: bad }), key).toBeNull()
    }
  })

  it('keeps an explicit zero', () => {
    expect(parseLoyaltySettings({ ...CONFIGURED, LOYALTY_XP_PER_LEVEL: '0', LOYALTY_REDEMPTION_RATIO_EUR: '0' }))
      .toMatchObject({ xpPerLevel: 0, redemptionRatioEur: 0 })
  })

  it('keeps the decimals of the ratio and factor', () => {
    expect(parseLoyaltySettings({ ...CONFIGURED, LOYALTY_REDEMPTION_RATIO_EUR: '12.25', LOYALTY_POINTS_FACTOR: '0.75' }))
      .toMatchObject({ redemptionRatioEur: 12.25, pointsFactor: 0.75 })
  })

  // The same truthiness every other merchant setting follows
  // (`parseSettingFlag`): the sitemap, the menus and the route gate read
  // `1` / `yes` as on, so the loyalty flags must too.
  it.each(['True', 'true', '1', 'yes', ' YES '])('treats %j as an enabled flag', (value) => {
    expect(parseLoyaltySettings({ ...CONFIGURED, LOYALTY_TIER_MULTIPLIER_ENABLED: value, LOYALTY_NEW_CUSTOMER_BONUS_ENABLED: value }))
      .toMatchObject({ tierMultiplierEnabled: true, newCustomerBonusEnabled: true })
  })

  it.each(['False', 'false', '0', 'no', ''])('treats %j as a disabled flag', (value) => {
    expect(parseLoyaltySettings({ ...CONFIGURED, LOYALTY_TIER_MULTIPLIER_ENABLED: value, LOYALTY_NEW_CUSTOMER_BONUS_ENABLED: value }))
      .toMatchObject({ tierMultiplierEnabled: false, newCustomerBonusEnabled: false })
  })
})

describe('buildLoyaltyTransactionsQuery', () => {
  it('renames every filter to its Django name', () => {
    expect(buildLoyaltyTransactionsQuery({
      page: 2,
      transactionType: 'EARN',
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
    })).toEqual({
      page: 2,
      transaction_type: 'EARN',
      created_after: '2026-01-01',
      created_before: '2026-01-31',
    })
  })

  it.each([
    ['no params', undefined],
    ['empty params', {}],
    ['params explicitly undefined', { page: undefined, transactionType: undefined, dateFrom: undefined, dateTo: undefined }],
  ])('sends no query for %s', (_label, params) => {
    expect(buildLoyaltyTransactionsQuery(params)).toEqual({})
  })

  it('leaves out only the unset filters', () => {
    expect(buildLoyaltyTransactionsQuery({ page: 1, dateTo: '2026-02-01' }))
      .toEqual({ page: 1, created_before: '2026-02-01' })
  })
})

describe('tierStartXp', () => {
  it.each([
    [1, 1000, 0],
    [3, 1000, 2000],
    [5, 2500, 10000],
  ])('starts a tier that needs level %i at %i XP per level on %i XP', (requiredLevel, xpPerLevel, expected) => {
    expect(tierStartXp({ requiredLevel }, xpPerLevel)).toBe(expected)
  })
})

describe('tierProgress', () => {
  it('measures the way from one tier start to the next', () => {
    expect(tierProgress(2500, 2000, 4000)).toBe(25)
  })

  it.each([
    ['below the start', 1500, 0],
    ['past the next start', 4500, 100],
  ])('keeps a total %s inside 0–100', (_case, totalXp, expected) => {
    expect(tierProgress(totalXp, 2000, 4000)).toBe(expected)
  })

  it('is full when there is no step left to take', () => {
    expect(tierProgress(5000, 4000, 4000)).toBe(100)
  })
})
