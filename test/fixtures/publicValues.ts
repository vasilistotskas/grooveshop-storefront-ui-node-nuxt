import type { PublicValues } from '~~/shared/openapi/types.gen'

/**
 * `values` of Django's `GET /settings/public`: every public scalar setting
 * in its own type (proved against `zPublicValues` by
 * `test/unit/fixtures/publicValues.spec.ts`).
 *
 * Defaults are the platform's declared ones: gift cards from 10 to 500 euro
 * valid 1825 days, contact files of up to 10 MB (3 files), 100 points per
 * euro, 1 point earned per euro, no expiry or bonus, 1000 XP per level, no
 * return window or fees stated, no store location and no demo accounts.
 * Overrides merge.
 */
export function makePublicValues(overrides: Partial<PublicValues> = {}): PublicValues {
  return {
    contactAttachmentsMaxCount: 3,
    contactAttachmentsMaxMb: 10,
    contactEmail: '',
    demoAccountB2bEmail: '',
    demoAccountB2bPassword: '',
    demoAccountEmail: '',
    demoAccountPassword: '',
    dispatchCutoff: '15:00',
    giftCardMaxAmount: 500,
    giftCardMinAmount: 10,
    giftCardValidityDays: 1825,
    loyaltyNewCustomerBonusEnabled: false,
    loyaltyNewCustomerBonusPoints: 0,
    loyaltyPointsExpirationDays: 0,
    loyaltyPointsFactor: 1,
    loyaltyRedemptionRatioEur: 100,
    loyaltyTierMultiplierEnabled: false,
    loyaltyXpPerLevel: 1000,
    returnFees: '',
    returnWindowDays: 0,
    storeGeoLat: null,
    storeGeoLng: null,
    ...overrides,
  }
}
