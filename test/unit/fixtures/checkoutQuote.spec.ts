import { describe, expect, it } from 'vitest'

import { zCartQuote, zCheckoutQuote } from '~~/shared/openapi/zod.gen'
import { makeCartQuote, makeCheckoutQuote, unpricedQuote } from '~~/test/fixtures/checkoutQuote'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/**
 * The quote fixtures parse strictly through the generated schemas. The
 * guarantee covers what the examples supply: a field Django adds, drops
 * or makes nullable in a row these examples hold fails here and names
 * itself, so the priced quote carries a row of every list.
 */
describe('checkout quote fixtures', () => {
  it('builds a priced quote that parses through zCartQuote', () => {
    expect(problems(zCartQuote, makeCartQuote())).toEqual([])
  })

  it('builds a quote with every list populated that parses through zCartQuote', () => {
    const populated = makeCartQuote({
      appliedPromotions: [{ promotionId: 1, name: 'Φθινόπωρο', code: 'AUTUMN', amount: 10 }],
      blockingCoupon: { code: 'SAVE5', reason: 'discount_code_minimum_not_met' },
      shippingOptions: [{ providerCode: 'acs', providerName: 'ACS', kind: 'home_delivery', price: 3, waivedBy: 'threshold', exceedsMaxWeight: false, exceedsParcelSize: false }],
      payWays: [{ id: 1, key: 'PAY_ON_DELIVERY', fee: 2, waived: false }],
    })

    expect(problems(zCartQuote, populated)).toEqual([])
  })

  it('builds an unpriced quote that parses through zCartQuote', () => {
    expect(problems(zCartQuote, unpricedQuote())).toEqual([])
  })

  it('builds the quote of a 409 that parses through zCheckoutQuote', () => {
    expect(problems(zCheckoutQuote, makeCheckoutQuote())).toEqual([])
  })
})
