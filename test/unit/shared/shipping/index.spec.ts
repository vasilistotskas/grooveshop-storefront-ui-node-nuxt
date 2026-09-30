import { describe, it, expect } from 'vitest'
import {
  carrierForMethod,
  methodForCarrier,
  methodKeyForOption,
  resolveShippingMethod,
} from '~~/shared/shipping/index'

describe('carrierForMethod / methodForCarrier', () => {
  it.each([
    ['box_now_locker', 'boxnow'],
    ['acs_smartpoint', 'acs'],
  ])('maps the checkout method %s to the %s carrier and back', (method, code) => {
    expect(carrierForMethod(method)?.code).toBe(code)
    expect(methodForCarrier(code)).toBe(method)
  })

  it('has no carrier for home delivery, which ships through any provider', () => {
    expect(carrierForMethod('home_delivery')).toBeNull()
  })

  it.each([['elta_pickup'], [null], [undefined], ['']])('has no carrier for %j', (method) => {
    expect(carrierForMethod(method)).toBeNull()
  })

  it('has no method for a carrier checkout does not know', () => {
    expect(methodForCarrier('elta')).toBeNull()
  })
})

describe('methodKeyForOption', () => {
  it.each([
    [{ providerCode: 'acs', kind: 'home_delivery' }, 'home_delivery'],
    [{ providerCode: 'boxnow', kind: 'home_delivery' }, 'home_delivery'],
    [{ providerCode: 'boxnow', kind: 'pickup_point' }, 'box_now_locker'],
    [{ providerCode: 'acs', kind: 'pickup_point' }, 'acs_smartpoint'],
    [{ providerCode: 'elta', kind: 'pickup_point' }, null],
    [{ providerCode: 'acs', kind: 'teleport' }, null],
  ])('keys %o as %j', (option, key) => {
    expect(methodKeyForOption(option)).toBe(key)
  })
})

/**
 * Checkout must open on a shipping method the store actually offers.
 *
 * The form state starts on `home_delivery`, and nothing reconciled that
 * against the live options. On a locker-only store the shopper saw an
 * unselected "BOX NOW Lockers" row while the form still believed home
 * delivery — so the payment step listed home delivery's pay ways, with
 * cash on delivery pre-selected, for an order that can never settle in
 * cash. It corrected itself only if the shopper clicked the row by hand.
 */
describe('resolveShippingMethod', () => {
  const HOME = { providerCode: 'acs', kind: 'home_delivery' }
  const BOXNOW_LOCKER = { providerCode: 'boxnow', kind: 'pickup_point' }
  const ACS_SMARTPOINT = { providerCode: 'acs', kind: 'pickup_point' }
  // Over the carrier's weight cap for this cart: shown, but not usable.
  const capped = <T extends object>(option: T) => ({ ...option, exceedsMaxWeight: true })

  it('moves to the only method a locker-only store offers', () => {
    expect(resolveShippingMethod([BOXNOW_LOCKER], 'home_delivery')).toBe('box_now_locker')
  })

  it('leaves a choice alone when the store offers it', () => {
    expect(resolveShippingMethod([HOME, BOXNOW_LOCKER], 'home_delivery')).toBeNull()
    expect(resolveShippingMethod([HOME, BOXNOW_LOCKER], 'box_now_locker')).toBeNull()
  })

  it('keeps the current choice when no options loaded', () => {
    // A transient options failure still leaves the flat-rate fallback
    // quoting home delivery — changing the method there would be worse.
    expect(resolveShippingMethod([], 'home_delivery')).toBeNull()
  })

  it('takes the first offered method when several are available', () => {
    expect(resolveShippingMethod([BOXNOW_LOCKER, ACS_SMARTPOINT], 'home_delivery')).toBe('box_now_locker')
  })

  it('ignores options it cannot map to a checkout method', () => {
    expect(resolveShippingMethod([{ providerCode: 'unknown', kind: 'pickup_point' }, BOXNOW_LOCKER], 'home_delivery'))
      .toBe('box_now_locker')
    expect(resolveShippingMethod([{ providerCode: 'unknown', kind: 'teleport' }], 'home_delivery')).toBeNull()
  })

  it('collapses several home-delivery carriers to one method', () => {
    expect(resolveShippingMethod([HOME, { providerCode: 'boxnow', kind: 'home_delivery' }], 'home_delivery')).toBeNull()
  })

  it('never auto-selects a method the cart is too heavy for', () => {
    // A CY cart over BoxNow's 4kg cap: the only pickup option offered
    // is over the limit, so the current home-delivery choice stands.
    expect(resolveShippingMethod([capped(BOXNOW_LOCKER)], 'home_delivery')).toBeNull()
    expect(resolveShippingMethod([capped(BOXNOW_LOCKER), ACS_SMARTPOINT], 'home_delivery')).toBe('acs_smartpoint')
  })

  it.each([
    ['home delivery', [capped(BOXNOW_LOCKER), HOME], 'home_delivery'],
    ['another locker', [capped(BOXNOW_LOCKER), ACS_SMARTPOINT], 'acs_smartpoint'],
  ])('moves a shopper off a locker the cart outgrew, to %s', (_case, options, expected) => {
    expect(resolveShippingMethod(options, 'box_now_locker')).toBe(expected)
  })
})
