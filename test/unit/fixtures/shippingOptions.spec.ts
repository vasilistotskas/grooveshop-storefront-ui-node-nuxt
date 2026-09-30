import { describe, expect, it } from 'vitest'
import type { z } from 'zod'

import { zShippingOption } from '~~/shared/openapi/zod.gen'
import {
  acsHomeDeliveryOption,
  acsSmartpointOption,
  boxNowLockerOption,
  makeShippingOption,
} from '~~/test/fixtures/shippingOptions'

/**
 * The shipping-option rows replace hand-built literals repeated across
 * the StepShipping specs. Parsed strictly (an unknown key is a renamed
 * field) so a change to `/api/v1/shipping/options` fails here, naming the
 * field, rather than as a checkout spec passing against a row Django
 * cannot send.
 */
function problems(schema: z.ZodObject, value: unknown): string[] {
  const result = schema.strict().safeParse(value)
  return result.success
    ? []
    : result.error.issues.map(i => `${i.path.join('.') || '(root)'}: ${i.message}`)
}

describe('shipping option fixtures', () => {
  it.each([
    ['makeShippingOption', makeShippingOption()],
    ['boxNowLockerOption', boxNowLockerOption()],
    ['acsHomeDeliveryOption', acsHomeDeliveryOption()],
    ['acsSmartpointOption', acsSmartpointOption()],
  ])('%s parses through zShippingOption', (_name, option) => {
    expect(problems(zShippingOption, option)).toEqual([])
  })

  it('keeps an over-cap row with pay ways valid', () => {
    const option = boxNowLockerOption({
      maxWeightGrams: 4000,
      exceedsMaxWeight: true,
      payWays: [{ id: 1, name: 'CREDIT_CARD' }],
    })

    expect(problems(zShippingOption, option)).toEqual([])
  })

  it('names the providers and kinds the checkout maps to its methods', () => {
    expect(boxNowLockerOption()).toMatchObject({ providerCode: 'boxnow', kind: 'pickup_point' })
    expect(acsHomeDeliveryOption()).toMatchObject({ providerCode: 'acs', kind: 'home_delivery' })
    expect(acsSmartpointOption()).toMatchObject({ providerCode: 'acs', kind: 'pickup_point' })
  })
})
