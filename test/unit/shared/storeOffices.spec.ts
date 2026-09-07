import { describe, expect, it } from 'vitest'
import {
  formatOfficeAddress,
  parseStoreOfficesValue,
} from '../../../shared/schemas/storeOffices'

/**
 * The render-time half of the `STORE_OFFICES` contract.
 *
 * Django's `validate_store_offices_setting` is the strict half — it
 * refuses bad data at the admin/API boundary with a readable error.
 * This side is deliberately FAIL-SOFT: historical or hand-edited data
 * that no longer fits must degrade to "no offices", never to a broken
 * footer. So the cases below assert `null` where the Django tests
 * assert a validation failure.
 */
const OFFICE = {
  label: 'Θεσσαλονίκη',
  street: 'Γ. Ρίτσου 7',
  area: 'Καλαμαριά',
  postal: '551 32',
  city: 'Θεσσαλονίκη',
  phones: ['2310 924 440', '2310 934 169'],
  i18n: {
    en: {
      label: 'Thessaloniki',
      street: '7 G. Ritsou St.',
      area: 'Kalamaria',
      city: 'Thessaloniki',
    },
  },
}

const json = (value: unknown) => JSON.stringify(value)

describe('parseStoreOfficesValue', () => {
  it('parses a full office', () => {
    const parsed = parseStoreOfficesValue(json([OFFICE]))

    expect(parsed).toHaveLength(1)
    expect(parsed?.[0]?.label).toBe('Θεσσαλονίκη')
    expect(parsed?.[0]?.phones).toEqual(['2310 924 440', '2310 934 169'])
    expect(parsed?.[0]?.i18n?.en?.city).toBe('Thessaloniki')
  })

  it('parses an office carrying only the required fields', () => {
    const parsed = parseStoreOfficesValue(
      json([{ label: 'Αττική', street: 'Ιλισίων 23' }]),
    )

    expect(parsed).toHaveLength(1)
    expect(parsed?.[0]?.city).toBeUndefined()
  })

  it('treats an unset or empty setting as the feature being off', () => {
    expect(parseStoreOfficesValue('')).toBeNull()
    expect(parseStoreOfficesValue(undefined)).toBeNull()
    expect(parseStoreOfficesValue(null)).toBeNull()
    expect(parseStoreOfficesValue('[]')).toBeNull()
  })

  it('returns null rather than throwing on malformed JSON', () => {
    expect(parseStoreOfficesValue('[{')).toBeNull()
  })

  it('returns null when the payload is not a list of offices', () => {
    expect(parseStoreOfficesValue(json(OFFICE))).toBeNull()
    expect(parseStoreOfficesValue(json(['Θεσσαλονίκη']))).toBeNull()
  })

  it('drops the whole list when an office lacks a label or a street', () => {
    for (const missing of ['label', 'street'] as const) {
      const office = { ...OFFICE, [missing]: undefined }

      expect(parseStoreOfficesValue(json([office])), missing).toBeNull()
    }
  })

  it('is bounded — a runaway list renders nothing, not a wall', () => {
    expect(parseStoreOfficesValue(json(Array(11).fill(OFFICE)))).toBeNull()
    expect(parseStoreOfficesValue(json(Array(10).fill(OFFICE)))).toHaveLength(10)
  })

  it('caps the phone numbers per office', () => {
    const phones = Array.from({ length: 7 }, (_, i) => `231000000${i}`)

    expect(parseStoreOfficesValue(json([{ ...OFFICE, phones }]))).toBeNull()
  })

  it('strips an unknown key instead of failing the office', () => {
    // The mirror of Django's `test_unknown_keys_are_refused`: a typo is
    // stopped where it is authored, but data already stored with one
    // still has to render. `.strip()` drops it and keeps the office.
    const parsed = parseStoreOfficesValue(
      json([{ ...OFFICE, postcode: '551 32' }]),
    )

    expect(parsed).toHaveLength(1)
    expect(parsed?.[0]).not.toHaveProperty('postcode')
  })

  it('keeps the locale overlay to text, stripping numbers', () => {
    const parsed = parseStoreOfficesValue(
      json([{ ...OFFICE, i18n: { en: { city: 'Thessaloniki', postal: '55132' } } }]),
    )

    expect(parsed?.[0]?.i18n?.en?.city).toBe('Thessaloniki')
    expect(parsed?.[0]?.i18n?.en).not.toHaveProperty('postal')
  })
})

describe('formatOfficeAddress', () => {
  it('writes the address the way the artboard prints it', () => {
    // `street, area postal, city` — the postcode rides with the AREA,
    // which is how a Greek address is written.
    expect(formatOfficeAddress(OFFICE)).toBe(
      'Γ. Ρίτσου 7, Καλαμαριά 551 32, Θεσσαλονίκη',
    )
  })

  it('drops the parts an office does not carry', () => {
    expect(formatOfficeAddress({ street: 'Ιλισίων 23' })).toBe('Ιλισίων 23')
    expect(
      formatOfficeAddress({ street: 'Ιλισίων 23', city: 'Αττική' }),
    ).toBe('Ιλισίων 23, Αττική')
    expect(
      formatOfficeAddress({ street: 'Ιλισίων 23', postal: '157 71' }),
    ).toBe('Ιλισίων 23, 157 71')
  })
})
