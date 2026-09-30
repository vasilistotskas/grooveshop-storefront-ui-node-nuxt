import type { Country } from '~~/shared/openapi/types.gen'
import { FIXTURE_TIMESTAMP, fixtureUuid } from './product'

/**
 * A `Country` as Django serialises it, valid against the generated
 * `zCountry` (proved by `test/unit/fixtures/country.spec.ts`).
 *
 * Defaults: Greece (`GR`, `+30`, regions on) with the phone metadata
 * the checkout reads for it, sort order 1. `uuid` follows `sortOrder`,
 * so two countries built with different sort orders never share one.
 * Another country states its own codes; nothing is derived from
 * `alpha2`:
 *
 * ```ts
 * makeCountry({
 *   alpha2: 'CY', alpha3: 'CYP', phoneCode: 357, sortOrder: 2,
 *   translations: { el: { name: 'Κύπρος' }, en: { name: 'Cyprus' } },
 * })
 * ```
 */
export function makeCountry(overrides: Partial<Country> = {}): Country {
  const sortOrder = overrides.sortOrder ?? 1

  return {
    translations: { el: { name: 'Ελλάδα' }, en: { name: 'Greece' } },
    alpha2: 'GR',
    alpha3: 'GRC',
    isoCc: 300,
    phoneCode: 30,
    postalCodePattern: '\\d{3} ?\\d{2}',
    postalCodeExample: '151 24',
    phoneMetadata: {
      nationalNumberPattern: '5005000\\d{3}|8\\d{9,11}|(?:[269]\\d|70)\\d{8}',
      possibleLengths: [10, 11, 12],
      nationalPrefixForParsing: null,
      exampleMobile: '6912345678',
    },
    hasRegions: true,
    sortOrder,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    uuid: fixtureUuid(16, sortOrder ?? 0),
    mainImagePath: '',
    ...overrides,
  }
}
