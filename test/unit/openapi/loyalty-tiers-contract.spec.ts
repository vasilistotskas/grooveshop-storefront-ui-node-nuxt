import { describe, expect, it } from 'vitest'
import { zListLoyaltyTiersResponse } from '~~/shared/openapi/zod.gen'
import { makeTier } from '~~/test/fixtures/loyalty'

// Django's `tiers` action answers every tier as one bare array; the schema
// once documented a paginated envelope, so the proxy validated against a
// hand-written `z.array(zLoyaltyTier)` instead of the generated response.
describe('listLoyaltyTiers response contract', () => {
  it('reads the bare array Django answers', () => {
    const tiers = [makeTier(), makeTier({ id: 2, requiredLevel: 10 })]

    expect(zListLoyaltyTiersResponse.parse(tiers)).toEqual(tiers)
  })

  it('refuses a paginated envelope', () => {
    const envelope = { count: 1, results: [makeTier()] }

    expect(zListLoyaltyTiersResponse.safeParse(envelope).success).toBe(false)
  })
})
