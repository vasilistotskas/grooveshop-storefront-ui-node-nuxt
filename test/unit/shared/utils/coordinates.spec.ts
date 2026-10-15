import { describe, expect, it } from 'vitest'

import { LATITUDE_LIMIT, LONGITUDE_LIMIT, parseDegrees } from '../../../../shared/utils/coordinates'

/**
 * A store's coordinates are published as its location (the map's pin and
 * the structured data), so only a value that IS decimal degrees in range
 * counts; the mirror of Django's `validate_latitude_setting` and
 * `validate_longitude_setting`.
 */
describe('parseDegrees', () => {
  it.each([
    ['40.565129', 40.565129],
    ['-33.8688', -33.8688],
    ['0', 0],
    ['90', 90],
    [' 22.119096 ', 22.119096],
  ])('reads %j as %s', (raw, degrees) => {
    expect(parseDegrees(raw, LATITUDE_LIMIT)).toBe(degrees)
  })

  it.each([
    ['37.9oops', 'trailing text that parseFloat would drop'],
    ['', 'an empty setting, which Number() reads as 0'],
    ['40,565129', 'a decimal comma'],
    ['1e1', 'an exponent'],
    ['.5', 'no integer part'],
    ['+40.5', 'a plus sign'],
    ['NaN', 'not a number'],
  ])('refuses %j: %s', (raw) => {
    expect(parseDegrees(raw, LATITUDE_LIMIT)).toBeUndefined()
  })

  it('keeps each axis within its own range', () => {
    expect(parseDegrees('91', LATITUDE_LIMIT)).toBeUndefined()
    expect(parseDegrees('-90.0001', LATITUDE_LIMIT)).toBeUndefined()
    expect(parseDegrees('179.9', LONGITUDE_LIMIT)).toBe(179.9)
    expect(parseDegrees('181', LONGITUDE_LIMIT)).toBeUndefined()
  })
})
