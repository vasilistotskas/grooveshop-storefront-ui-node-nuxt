import { describe, expect, it } from 'vitest'

import { zProductShipping } from '~~/shared/openapi/zod.gen'
import { makeProductShipping, makeProductShippingEstimate } from '~~/test/fixtures/productShipping'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/**
 * The product shipping answer the route specs use. Parsed strictly (an
 * unknown key is a renamed field), so a change to
 * `/api/v1/shipping/product/<id>` fails here, naming the field.
 */
describe('product shipping fixtures', () => {
  it.each([
    ['a priced estimate', makeProductShipping()],
    ['no threshold', makeProductShipping(makeProductShippingEstimate({ freeShippingThreshold: null }))],
    ['ships free', makeProductShipping(makeProductShippingEstimate({ price: 0, free: true }))],
    ['no estimate', makeProductShipping(null)],
  ])('%s parses through zProductShipping', (_name, body) => {
    expect(problems(zProductShipping, body)).toEqual([])
  })
})
