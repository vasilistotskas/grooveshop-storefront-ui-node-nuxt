import { describe, expect, it } from 'vitest'
import { getCarrier, isCarrierCode, listCarriers } from '~~/shared/shipping/registry'

/**
 * The carrier registry is the dispatch table: checkout asks it which
 * adapter handles a provider code instead of branching on the code.
 * Its keys must match the Python registry's (`shipping/interfaces.py`),
 * which is why the set is written out — a carrier added on one side
 * only has to fail here.
 */
describe('shipping/registry', () => {
  it('registers exactly the ACS and BoxNow adapters, in their listed order', () => {
    expect(listCarriers().map(c => c.code)).toEqual(['acs', 'boxnow'])
  })

  it('looks a carrier up by its provider code', () => {
    expect(getCarrier('acs')?.label).toBe('ACS Courier')
    expect(getCarrier('boxnow')?.label).toBe('BOX NOW')
  })

  it.each([['elta'], [''], [null], [undefined]])('has no carrier for %j', (code) => {
    expect(getCarrier(code)).toBeNull()
  })

  it('tells a registered carrier code from anything else', () => {
    expect(isCarrierCode('acs')).toBe(true)
    expect(isCarrierCode('boxnow')).toBe(true)
    // `home_delivery` ships through any provider and has no adapter.
    expect(isCarrierCode('home_delivery')).toBe(false)
    expect(isCarrierCode(42)).toBe(false)
  })
})
