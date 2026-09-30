import { describe, expect, it } from 'vitest'

import { zCountry } from '~~/shared/openapi/zod.gen'
import { makeCountry } from '~~/test/fixtures/country'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/**
 * `makeCountry` replaces the `{ alpha2, phoneCode } as unknown as
 * Country` rows the checkout specs built. Parsed strictly, so a stale
 * key fails here and names itself.
 */
describe('makeCountry', () => {
  it('builds a default country that parses through zCountry', () => {
    expect(problems(zCountry, makeCountry())).toEqual([])
  })

  it('keeps a second country valid and distinct from the first', () => {
    const cyprus = makeCountry({ alpha2: 'CY', alpha3: 'CYP', phoneCode: 357, sortOrder: 2, phoneMetadata: null })

    expect(problems(zCountry, cyprus)).toEqual([])
    expect(cyprus.uuid).not.toBe(makeCountry().uuid)
  })
})
