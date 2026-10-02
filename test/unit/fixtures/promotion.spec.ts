import { describe, expect, it } from 'vitest'

import { zPublicPromotion } from '~~/shared/openapi/zod.gen'
import { makePromotion } from '~~/test/fixtures/promotion'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/** Parsed strictly, so a renamed field fails here rather than in a spec passing against a payload Django cannot send. */
describe('promotion fixtures', () => {
  it('makePromotion parses strictly', () => {
    expect(problems(zPublicPromotion, makePromotion())).toEqual([])
  })

  it('makePromotion parses strictly as an automatic fixed-amount offer', () => {
    const automatic = makePromotion({ trigger: 'AUTOMATIC', code: null, benefitType: 'FIXED_AMOUNT', benefitValue: 5 })

    expect(problems(zPublicPromotion, automatic)).toEqual([])
  })
})
