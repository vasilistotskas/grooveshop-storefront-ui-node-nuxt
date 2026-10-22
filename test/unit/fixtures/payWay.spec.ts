import { describe, expect, it } from 'vitest'

import { zPayWay } from '~~/shared/openapi/zod.gen'
import { makePayWay } from '~~/test/fixtures/payWay'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/**
 * `makePayWay` replaces pay ways built `as unknown as PayWay` with
 * fields the schema does not have (`name`, `iconName`, `clientCode`)
 * and without the ones it requires. Parsed strictly, so a stale key
 * fails here and names itself.
 */
describe('makePayWay', () => {
  it('builds a default pay way that parses through zPayWay', () => {
    expect(problems(zPayWay, makePayWay())).toEqual([])
  })

  it.each([
    'online',
    'courier_cash',
    'carrier_terminal',
    'offline_transfer',
  ] as const)('builds a %s pay way that parses through zPayWay', (settlement) => {
    expect(problems(zPayWay, makePayWay({ id: 2, providerCode: 'stripe', settlement }))).toEqual([])
  })
})
