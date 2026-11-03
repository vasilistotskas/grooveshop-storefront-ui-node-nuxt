import { describe, expect, it } from 'vitest'
import { zPublicValues } from '~~/shared/openapi/zod.gen'
import { makePublicValues } from '~~/test/fixtures/publicValues'
import { problems } from '~~/test/unit/fixtures/strictSchema'

describe('publicValues fixture', () => {
  it('parses strictly against the generated schema', () => {
    expect(problems(zPublicValues, makePublicValues())).toEqual([])
  })

  it('merges overrides', () => {
    expect(makePublicValues({ storeGeoLat: 37.9, returnFees: 'free' })).toMatchObject({ storeGeoLat: 37.9, returnFees: 'free', giftCardMinAmount: 10 })
  })
})
