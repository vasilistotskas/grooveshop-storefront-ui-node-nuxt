import { describe, expect, it } from 'vitest'

import { zCartQuote, zCheckoutQuote } from '~~/shared/openapi/zod.gen'
import { makeCartQuote, makeCheckoutQuote, unpricedQuote } from '~~/test/fixtures/checkoutQuote'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/**
 * The quote fixtures parse strictly through the generated schemas, so a
 * field Django adds, drops or makes nullable fails here and names itself.
 */
describe('checkout quote fixtures', () => {
  it('builds a priced quote that parses through zCartQuote', () => {
    expect(problems(zCartQuote, makeCartQuote())).toEqual([])
  })

  it('builds an unpriced quote that parses through zCartQuote', () => {
    expect(problems(zCartQuote, unpricedQuote())).toEqual([])
  })

  it('builds the quote of a 409 that parses through zCheckoutQuote', () => {
    expect(problems(zCheckoutQuote, makeCheckoutQuote())).toEqual([])
  })
})
