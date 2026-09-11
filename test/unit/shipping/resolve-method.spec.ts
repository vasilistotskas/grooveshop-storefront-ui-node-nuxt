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

import { describe, it, expect } from 'vitest'
import { resolveShippingMethod } from '../../../shared/shipping/index'

const HOME = { providerCode: 'acs', kind: 'home_delivery' }
const BOXNOW_LOCKER = { providerCode: 'boxnow', kind: 'pickup_point' }
const ACS_SMARTPOINT = { providerCode: 'acs', kind: 'pickup_point' }

describe('resolveShippingMethod', () => {
  it('moves to the only method a locker-only store offers', () => {
    expect(resolveShippingMethod([BOXNOW_LOCKER], 'home_delivery'))
      .toBe('box_now_locker')
  })

  it('leaves a choice alone when the store offers it', () => {
    expect(resolveShippingMethod([HOME, BOXNOW_LOCKER], 'home_delivery'))
      .toBeNull()
    expect(resolveShippingMethod([HOME, BOXNOW_LOCKER], 'box_now_locker'))
      .toBeNull()
  })

  it('keeps the current choice when no options loaded', () => {
    // A transient options failure still leaves the flat-rate fallback
    // quoting home delivery — changing the method there would be worse.
    expect(resolveShippingMethod([], 'home_delivery')).toBeNull()
  })

  it('takes the first offered method when several are available', () => {
    expect(resolveShippingMethod(
      [BOXNOW_LOCKER, ACS_SMARTPOINT],
      'home_delivery',
    )).toBe('box_now_locker')
  })

  it('ignores options it cannot map to a checkout method', () => {
    expect(resolveShippingMethod(
      [{ providerCode: 'unknown', kind: 'pickup_point' }, BOXNOW_LOCKER],
      'home_delivery',
    )).toBe('box_now_locker')
  })

  it('keeps the choice when nothing maps', () => {
    expect(resolveShippingMethod(
      [{ providerCode: 'unknown', kind: 'teleport' }],
      'home_delivery',
    )).toBeNull()
  })

  it('collapses several home-delivery carriers to one method', () => {
    expect(resolveShippingMethod(
      [HOME, { providerCode: 'boxnow', kind: 'home_delivery' }],
      'home_delivery',
    )).toBeNull()
  })
})
