import { describe, expect, it } from 'vitest'

import { isValidGreekAfm } from '../../../shared/utils/afm'

// Mirror of grooveshop-django-api/b2b/validators.py — the two suites
// pin the same fixtures so a drift in either side fails loudly.
describe('isValidGreekAfm', () => {
  it.each([
    '123456783', // synthetic, checksum-valid
    '094014201', // real-world format (OTE), checksum-valid
    '090000045',
  ])('accepts checksum-valid %s', (value) => {
    expect(isValidGreekAfm(value)).toBe(true)
  })

  it.each([
    '123456789', // bad check digit
    '094014200', // off by one
    '12345678', // too short
    '1234567890', // too long
    '12345678A', // non-digit
    '',
    '000000000', // degenerate all-zero
  ])('rejects %s', (value) => {
    expect(isValidGreekAfm(value)).toBe(false)
  })

  it('strips the EL/GR prefix like the Django serializer does', () => {
    expect(isValidGreekAfm('EL123456783')).toBe(true)
    expect(isValidGreekAfm('gr123456783')).toBe(true)
    // Space after the prefix is tolerated on BOTH sides (Django strips
    // the prefix then re-strips whitespace) — pinned so they agree.
    expect(isValidGreekAfm('EL 123456783')).toBe(true)
  })

  it('tolerates surrounding whitespace', () => {
    expect(isValidGreekAfm(' 123456783 ')).toBe(true)
  })
})
