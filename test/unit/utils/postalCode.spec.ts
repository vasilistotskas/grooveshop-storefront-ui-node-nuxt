import { describe, expect, it } from 'vitest'
import {
  addressIssues,
  normalizePostcode,
  postcodeMatches,
} from '~~/shared/utils/postalCode'

// Rows as the countries API serves them — Google's Address Data Service
// ``zip`` regex and first ``zipex``, seeded by Django's
// ``country/migrations/0011_country_postal_code_format.py``.
const GREECE = { postalCodePattern: '\\d{3} ?\\d{2}', postalCodeExample: '151 24' }
const CYPRUS = { postalCodePattern: '\\d{4}', postalCodeExample: '2008' }
const FALKLANDS = { postalCodePattern: 'FIQQ 1ZZ', postalCodeExample: 'FIQQ 1ZZ' }
const BAHRAIN = {
  postalCodePattern: '(?:^|\\b)(?:1[0-2]|[1-9])\\d{2}(?:$|\\b)',
  postalCodeExample: '317',
}
const NO_FORMAT = { postalCodePattern: '' }

describe('normalizePostcode', () => {
  it.each([
    ['70300', '70300'],
    [' 703  00 ', '703 00'],
    ['703\t00', '703 00'],
    ['sw1a 1aa', 'SW1A 1AA'],
    ['   ', ''],
  ])('%j → %j (mirrors Django)', (raw, expected) => {
    expect(normalizePostcode(raw)).toBe(expected)
  })
})

describe('postcodeMatches', () => {
  it.each(['70300', '703 00', ' 703  00 '])('accepts the Greek postcode %j', (value) => {
    expect(postcodeMatches(GREECE, value)).toBe(true)
  })

  it.each(['ΑΒΓΔ', '7030', '703000', '', '   '])('rejects %j for Greece', (value) => {
    expect(postcodeMatches(GREECE, value)).toBe(false)
  })

  it('keeps a space the format requires', () => {
    expect(postcodeMatches(FALKLANDS, 'fiqq  1zz')).toBe(true)
  })

  it('anchors a pattern that carries its own anchors', () => {
    expect(postcodeMatches(BAHRAIN, '317')).toBe(true)
    expect(postcodeMatches(BAHRAIN, '3170')).toBe(false)
  })

  it('does not accept non-ASCII digits (Django compiles with re.ASCII)', () => {
    expect(postcodeMatches(GREECE, '٧٠٣٠٠')).toBe(false)
  })

  it('accepts any non-empty value for a country without a format', () => {
    expect(postcodeMatches(NO_FORMAT, 'anything')).toBe(true)
    expect(postcodeMatches(undefined, 'anything')).toBe(true)
    expect(postcodeMatches(NO_FORMAT, '')).toBe(false)
  })
})

describe('addressIssues', () => {
  it('flags all three fields of prod order #316', () => {
    expect(addressIssues(GREECE, {
      street: '1',
      streetNumber: '70300',
      zipcode: 'ΑΒΓΔ',
    })).toEqual(['street', 'streetNumber', 'zipcode'])
  })

  it('passes a correct Greek address', () => {
    expect(addressIssues(GREECE, {
      street: 'Εγνατίας',
      streetNumber: '12Α',
      zipcode: '546 22',
    })).toEqual([])
  })

  it.each(['1', '12', '154', '12-14'])('leaves the street number %j alone', (streetNumber) => {
    expect(addressIssues(GREECE, {
      street: 'Εγνατίας',
      streetNumber,
      zipcode: '54622',
    })).toEqual([])
  })

  it('flags a four-digit Cypriot postcode in the street number', () => {
    expect(addressIssues(CYPRUS, {
      street: 'Makariou',
      streetNumber: '2008',
      zipcode: '1065',
    })).toEqual(['streetNumber'])
  })

  it('only checks the street for a country without a format', () => {
    expect(addressIssues(NO_FORMAT, {
      street: 'Main Street',
      streetNumber: '70300',
      zipcode: 'whatever',
    })).toEqual([])
  })
})
