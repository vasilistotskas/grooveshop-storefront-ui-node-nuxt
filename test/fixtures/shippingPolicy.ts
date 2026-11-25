import type { Region } from '~~/shared/openapi/types.gen'
import { FIXTURE_TIMESTAMP, fixtureUuid } from './product'

/**
 * A `Region` as Django serialises it, valid against the generated `zRegion`
 * (proved by `test/unit/fixtures/shippingPolicy.spec.ts`).
 *
 * Defaults: Attica in Greece, sort order 1. `uuid` follows `sortOrder`, so
 * two regions built with different sort orders never share one.
 */
export function makeRegion(overrides: Partial<Region> = {}): Region {
  const sortOrder = overrides.sortOrder ?? 1

  return {
    translations: { el: { name: 'Αττική' }, en: { name: 'Attica' } },
    alpha: 'GR-I',
    country: 'GR',
    sortOrder,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    uuid: fixtureUuid(34, sortOrder ?? 0),
    ...overrides,
  }
}

/**
 * A row of the store's shipping policy as `GET /api/shipping/policy`
 * answers it (`ShippingPolicyRow`): Django's row, valid against the
 * generated `zShippingPolicyEntry`, plus the regions it names.
 *
 * Defaults: ACS home delivery to the whole of Greece at 2,99 €, no
 * threshold, no delivery days, no weight cap. A regional row names its
 * regions both ways, as the route builds it:
 *
 * ```ts
 * const attica = makeRegion()
 * makeShippingPolicyRow({ regionCodes: [attica.alpha], regions: [attica] })
 * ```
 */
export function makeShippingPolicyRow(overrides: Partial<ShippingPolicyRow> = {}): ShippingPolicyRow {
  return {
    countryCode: 'GR',
    regionCodes: [],
    kind: 'home_delivery',
    providerCode: 'acs',
    providerName: 'ACS Courier',
    price: 2.99,
    currency: 'EUR',
    freeShippingThreshold: null,
    deliveryDaysMin: null,
    deliveryDaysMax: null,
    maxWeightGrams: null,
    regions: [],
    ...overrides,
  }
}
