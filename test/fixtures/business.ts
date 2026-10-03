import type { BusinessProfile } from '~~/shared/openapi/types.gen'
import { FIXTURE_TIMESTAMP, fixtureUuid } from './product'

/**
 * A `BusinessProfile` (`/api/b2b/profile`) valid against the generated
 * `zBusinessProfile` (proved by `test/unit/fixtures/business.spec.ts`).
 *
 * Defaults: an APPROVED profile in the wholesale group, VIES-verified,
 * created on `FIXTURE_TIMESTAMP`.
 */
export function makeBusinessProfile(overrides: Partial<BusinessProfile> = {}): BusinessProfile {
  return {
    uuid: fixtureUuid(26, 1),
    status: 'APPROVED',
    customerGroupName: 'Χονδρική',
    companyName: 'Groove Office ΙΚΕ',
    vatId: 'EL801234567',
    taxOffice: 'Δ΄ Θεσσαλονίκης',
    activity: 'Λιανικό εμπόριο αξεσουάρ κινητών',
    billingStreet: 'Τσιμισκή',
    billingStreetNumber: '100',
    billingCity: 'Θεσσαλονίκη',
    billingZipcode: '54622',
    viesStatus: 'VALID',
    viesCheckedAt: FIXTURE_TIMESTAMP,
    viesName: 'GROOVE OFFICE IKE',
    rejectionReason: '',
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    ...overrides,
  }
}
