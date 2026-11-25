import { describe, expect, it } from 'vitest'

import { zRegion, zShippingPolicyEntry } from '~~/shared/openapi/zod.gen'
import { makeRegion, makeShippingPolicyRow } from '~~/test/fixtures/shippingPolicy'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/**
 * The shipping-policy fixtures, parsed strictly, so a stale key fails here
 * and names itself. A row is Django's entry plus the regions the storefront's
 * route adds, so the entry is checked without them.
 */
describe('makeRegion', () => {
  it('builds a default region that parses through zRegion', () => {
    expect(problems(zRegion, makeRegion())).toEqual([])
  })

  it('keeps a second region valid and distinct from the first', () => {
    const crete = makeRegion({ alpha: 'GR-M', sortOrder: 2, translations: { el: { name: 'Κρήτη' }, en: { name: 'Crete' } } })

    expect(problems(zRegion, crete)).toEqual([])
    expect(crete.uuid).not.toBe(makeRegion().uuid)
  })
})

describe('makeShippingPolicyRow', () => {
  it('builds a whole-country row whose entry parses through zShippingPolicyEntry', () => {
    const { regions, ...entry } = makeShippingPolicyRow()

    expect(problems(zShippingPolicyEntry, entry)).toEqual([])
    expect(regions).toEqual([])
  })

  it('builds a regional row whose entry parses through zShippingPolicyEntry', () => {
    const attica = makeRegion()
    const { regions, ...entry } = makeShippingPolicyRow({ regionCodes: [attica.alpha], regions: [attica] })

    expect(problems(zShippingPolicyEntry, entry)).toEqual([])
    expect(regions.map(region => problems(zRegion, region))).toEqual([[]])
  })
})
