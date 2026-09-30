import { describe, it, expect } from 'vitest'
import {
  buildLoyaltyTransactionsQuery,
  defaultLoyaltySettings,
  LOYALTY_SETTING_KEYS,
  parseLoyaltySettings,
} from '~/utils/loyalty'

/** Every setting present and valid, as a correctly configured tenant returns them. */
const CONFIGURED = {
  LOYALTY_ENABLED: 'true',
  LOYALTY_REDEMPTION_RATIO_EUR: '50.5',
  LOYALTY_POINTS_FACTOR: '1.5',
  LOYALTY_TIER_MULTIPLIER_ENABLED: 'True',
  LOYALTY_POINTS_EXPIRATION_DAYS: '365',
  LOYALTY_NEW_CUSTOMER_BONUS_ENABLED: 'TRUE',
  LOYALTY_NEW_CUSTOMER_BONUS_POINTS: '200',
  LOYALTY_XP_PER_LEVEL: '2500',
}

describe('defaultLoyaltySettings', () => {
  it('is loyalty off with the documented fallbacks', () => {
    expect(defaultLoyaltySettings()).toEqual({
      enabled: false,
      redemptionRatioEur: 100,
      pointsFactor: 1.0,
      tierMultiplierEnabled: false,
      pointsExpirationDays: 0,
      newCustomerBonusEnabled: false,
      newCustomerBonusPoints: 0,
      xpPerLevel: 1000,
    })
  })
})

describe('parseLoyaltySettings', () => {
  it('reads every configured setting, booleans case-insensitively', () => {
    expect(parseLoyaltySettings(CONFIGURED)).toEqual({
      enabled: true,
      redemptionRatioEur: 50.5,
      pointsFactor: 1.5,
      tierMultiplierEnabled: true,
      pointsExpirationDays: 365,
      newCustomerBonusEnabled: true,
      newCustomerBonusPoints: 200,
      xpPerLevel: 2500,
    })
  })

  it('falls back to the defaults for an empty response', () => {
    expect(parseLoyaltySettings({})).toEqual(defaultLoyaltySettings())
  })

  // The endpoint answers `''` for a key whose Django fetch failed; a NaN
  // here would reach checkout's redemption maths.
  it.each(['', 'abc', 'NaN', 'Infinity'])('falls back to the defaults for every numeric setting set to %j', (bad) => {
    const parsed = parseLoyaltySettings({
      ...CONFIGURED,
      LOYALTY_REDEMPTION_RATIO_EUR: bad,
      LOYALTY_POINTS_FACTOR: bad,
      LOYALTY_POINTS_EXPIRATION_DAYS: bad,
      LOYALTY_NEW_CUSTOMER_BONUS_POINTS: bad,
      LOYALTY_XP_PER_LEVEL: bad,
    })
    expect(parsed).toMatchObject({
      redemptionRatioEur: 100,
      pointsFactor: 1.0,
      pointsExpirationDays: 0,
      newCustomerBonusPoints: 0,
      xpPerLevel: 1000,
    })
  })

  it('keeps an explicit zero rather than taking the default', () => {
    expect(parseLoyaltySettings({ LOYALTY_XP_PER_LEVEL: '0', LOYALTY_REDEMPTION_RATIO_EUR: '0' }))
      .toMatchObject({ xpPerLevel: 0, redemptionRatioEur: 0 })
  })

  it('truncates the integer settings and keeps the decimals of the ratio and factor', () => {
    expect(parseLoyaltySettings({
      LOYALTY_POINTS_EXPIRATION_DAYS: '30.9',
      LOYALTY_NEW_CUSTOMER_BONUS_POINTS: '99.5',
      LOYALTY_XP_PER_LEVEL: '1000.7',
      LOYALTY_REDEMPTION_RATIO_EUR: '12.25',
      LOYALTY_POINTS_FACTOR: '0.75',
    })).toMatchObject({
      pointsExpirationDays: 30,
      newCustomerBonusPoints: 99,
      xpPerLevel: 1000,
      redemptionRatioEur: 12.25,
      pointsFactor: 0.75,
    })
  })

  it.each(['false', '1', 'yes', ''])('treats %j as a disabled flag', (value) => {
    expect(parseLoyaltySettings({
      LOYALTY_ENABLED: value,
      LOYALTY_TIER_MULTIPLIER_ENABLED: value,
      LOYALTY_NEW_CUSTOMER_BONUS_ENABLED: value,
    })).toMatchObject({ enabled: false, tierMultiplierEnabled: false, newCustomerBonusEnabled: false })
  })

  it('requests exactly the keys it parses', () => {
    expect(Object.keys(CONFIGURED).sort()).toEqual([...LOYALTY_SETTING_KEYS].sort())
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
