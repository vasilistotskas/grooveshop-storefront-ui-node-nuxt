import { describe, it, expect } from 'vitest'
import {
  normalizePhone,
  isPlausiblePhone,
  stripDialCodeForDisplay,
  dialCodeLabel,
  resolvePhoneCountry,
  type PhoneCountry,
} from '~/utils/phone'

// Fixtures mirror the real ``phonenumbers`` metadata Django exposes on
// ``Country.phoneMetadata`` (verified 2026-09-27, see the BoxNow Cyprus
// plan): GR's pattern covers 5005000xxx / 8xxxxxxxxx(x)(x) / (2|6|9)x + 70
// ranges at 10-12 digits with no national prefix; CY's covers
// (2|7|9)x / (5|8)0 ranges at exactly 8 digits, also no national prefix.
// DE is a simplified fixture (not the full library pattern) used only to
// exercise the ``nationalPrefixForParsing`` ('0') branch our own code
// takes — GR and CY both have none, so nothing else covers it.
const GR: PhoneCountry = {
  phoneCode: 30,
  phoneMetadata: {
    nationalNumberPattern: '5005000\\d{3}|8\\d{9,11}|(?:[269]\\d|70)\\d{8}',
    possibleLengths: [10, 11, 12],
    nationalPrefixForParsing: null,
    exampleMobile: '6912345678',
  },
}

const CY: PhoneCountry = {
  phoneCode: 357,
  phoneMetadata: {
    nationalNumberPattern: '(?:[279]\\d|[58]0)\\d{6}',
    possibleLengths: [8],
    nationalPrefixForParsing: null,
    exampleMobile: '96123456',
  },
}

const DE: PhoneCountry = {
  phoneCode: 49,
  phoneMetadata: {
    nationalNumberPattern: '1\\d{9,10}',
    possibleLengths: [10, 11],
    nationalPrefixForParsing: '0',
    exampleMobile: '15123456789',
  },
}

describe('Phone Utilities', () => {
  describe('normalizePhone — GR', () => {
    it('prefixes bare Greek local numbers with +30', () => {
      expect(normalizePhone('6943413781', GR)).toBe('+306943413781')
      expect(normalizePhone('2101234567', GR)).toBe('+302101234567')
    })

    it('handles the country code typed without "+" (the checkout bug)', () => {
      // A user typed "306943413781" next to the sticky "+30" badge —
      // this used to produce the invalid "+30306943413781".
      expect(normalizePhone('306943413781', GR)).toBe('+306943413781')
      expect(normalizePhone('30 694 341 3781', GR)).toBe('+306943413781')
      expect(normalizePhone('0306943413781', GR)).toBe('+306943413781')
    })

    it('does not treat a short number starting with 30 as a country code', () => {
      // 10 digits starting "30" is not a valid Greek number either way
      // (GR's possible lengths are 10-12, but the REST after "30" here
      // is only 8 digits — not a valid length), so it must not be
      // silently rewritten into a different number.
      expect(normalizePhone('3069434137', GR)).toBe('+303069434137')
    })

    it('passes through numbers that already carry a prefix', () => {
      expect(normalizePhone('+306943413781', GR)).toBe('+306943413781')
      expect(normalizePhone('00306943413781', GR)).toBe('+306943413781')
      expect(normalizePhone('+447911123456', GR)).toBe('+447911123456')
    })

    it('strips whitespace, dashes, and parens', () => {
      expect(normalizePhone('694 341-3781', GR)).toBe('+306943413781')
      expect(normalizePhone('(210) 123-4567', GR)).toBe('+302101234567')
    })

    it('strips a single leading zero from domestic notation', () => {
      expect(normalizePhone('02111234567', GR)).toBe('+302111234567')
    })

    it('returns empty string for empty input', () => {
      expect(normalizePhone('', GR)).toBe('')
      expect(normalizePhone(null, GR)).toBe('')
      expect(normalizePhone(undefined, GR)).toBe('')
      expect(normalizePhone('  ', GR)).toBe('')
    })
  })

  describe('normalizePhone — CY', () => {
    it('prefixes bare Cypriot numbers with +357', () => {
      expect(normalizePhone('96123456', CY)).toBe('+35796123456')
      expect(normalizePhone('22123456', CY)).toBe('+35722123456')
    })

    it('handles the country code typed without "+" next to the +357 badge', () => {
      expect(normalizePhone('35796123456', CY)).toBe('+35796123456')
    })
  })

  describe('normalizePhone — DE (nationalPrefixForParsing)', () => {
    it('strips the leading "0" national prefix before prepending the dial code', () => {
      expect(normalizePhone('015123456789', DE)).toBe('+4915123456789')
    })

    it('re-prefixes a dial code typed without "+" using the country\'s possible lengths', () => {
      expect(normalizePhone('4915123456789', DE)).toBe('+4915123456789')
    })

    it('passes through an already-international number unchanged', () => {
      expect(normalizePhone('+4915123456789', DE)).toBe('+4915123456789')
    })
  })

  describe('isPlausiblePhone', () => {
    it('accepts valid Greek mobiles and landlines in any typed form', () => {
      expect(isPlausiblePhone('6943413781', GR)).toBe(true)
      expect(isPlausiblePhone('2101234567', GR)).toBe(true)
      expect(isPlausiblePhone('+306943413781', GR)).toBe(true)
      expect(isPlausiblePhone('306943413781', GR)).toBe(true)
      expect(isPlausiblePhone('694 341 3781', GR)).toBe(true)
    })

    it('accepts every other assigned Greek range (verified vs phonenumbers)', () => {
      expect(isPlausiblePhone('9412345678', GR)).toBe(true) // newer mobile range
      expect(isPlausiblePhone('6857123456', GR)).toBe(true) // 68x mobile range
      expect(isPlausiblePhone('8001234567', GR)).toBe(true) // toll-free
      expect(isPlausiblePhone('8011234567', GR)).toBe(true) // shared-cost
      expect(isPlausiblePhone('9091234567', GR)).toBe(true) // premium
      expect(isPlausiblePhone('7012345678', GR)).toBe(true) // personal number
      expect(isPlausiblePhone('5005000123', GR)).toBe(true) // corporate UAN
      expect(isPlausiblePhone('80012345678', GR)).toBe(true) // 11-digit toll-free
    })

    it('rejects Greek numbers with wrong length or unassigned leading digit', () => {
      expect(isPlausiblePhone('69434', GR)).toBe(false)
      expect(isPlausiblePhone('69434137811', GR)).toBe(false)
      expect(isPlausiblePhone('1234567890', GR)).toBe(false) // 1x unassigned
      expect(isPlausiblePhone('4001234567', GR)).toBe(false) // 4x unassigned
      expect(isPlausiblePhone('3069434137', GR)).toBe(false) // 3x unassigned
      // The exact pre-fix failure mode: "+3030…" double country code
      expect(isPlausiblePhone('+30306943413781', GR)).toBe(false)
    })

    it('accepts valid Cypriot mobiles and landlines (8-digit national number)', () => {
      expect(isPlausiblePhone('96123456', CY)).toBe(true) // 9x mobile
      expect(isPlausiblePhone('99123456', CY)).toBe(true) // 9x mobile
      expect(isPlausiblePhone('22123456', CY)).toBe(true) // 2x landline (Nicosia)
      expect(isPlausiblePhone('77123456', CY)).toBe(true) // 7x services
      expect(isPlausiblePhone('50123456', CY)).toBe(true) // 50 range
      expect(isPlausiblePhone('80123456', CY)).toBe(true) // 80 range
      expect(isPlausiblePhone('+35796123456', CY)).toBe(true)
    })

    it('rejects Cypriot numbers with the wrong length or unassigned leading digit', () => {
      expect(isPlausiblePhone('9612345', CY)).toBe(false) // 7 digits, too short
      expect(isPlausiblePhone('961234567', CY)).toBe(false) // 9 digits, too long
      expect(isPlausiblePhone('12345678', CY)).toBe(false) // 1x unassigned
    })

    it('accepts a Greek mobile shipping to a Cypriot delivery address', () => {
      // A '+' prefixed foreign number is always accepted at face value —
      // BoxNow now delivers to Cyprus lockers for a Greek e-shop, and the
      // shopper's own phone stays Greek.
      expect(isPlausiblePhone('+306943413781', CY)).toBe(true)
    })

    it('is lenient with foreign international numbers regardless of the delivery country', () => {
      expect(isPlausiblePhone('+447911123456', GR)).toBe(true)
      expect(isPlausiblePhone('+4915112345678', GR)).toBe(true)
      expect(isPlausiblePhone('+4915112345678', CY)).toBe(true)
    })

    it('rejects implausibly short or empty values', () => {
      expect(isPlausiblePhone('+1', GR)).toBe(false)
      expect(isPlausiblePhone('', GR)).toBe(false)
      expect(isPlausiblePhone(null, GR)).toBe(false)
      expect(isPlausiblePhone(undefined, GR)).toBe(false)
    })

    it('falls back to a loose E.164 check when the country has no phoneMetadata', () => {
      const noMetadata: PhoneCountry = { phoneCode: 999 }
      expect(isPlausiblePhone('+9991234567', noMetadata)).toBe(true)
      expect(isPlausiblePhone('+1', noMetadata)).toBe(false)
    })
  })

  describe('stripDialCodeForDisplay', () => {
    it('strips the GR dial code for display next to the +30 badge', () => {
      expect(stripDialCodeForDisplay('+306943413781', GR)).toBe('6943413781')
      expect(stripDialCodeForDisplay('00306943413781', GR)).toBe('6943413781')
    })

    it('strips the CY dial code for display next to the +357 badge', () => {
      expect(stripDialCodeForDisplay('+35796123456', CY)).toBe('96123456')
    })

    it('leaves foreign numbers and empty values untouched', () => {
      expect(stripDialCodeForDisplay('+447911123456', GR)).toBe('+447911123456')
      expect(stripDialCodeForDisplay('', GR)).toBe('')
      expect(stripDialCodeForDisplay(undefined, GR)).toBe('')
    })

    it('returns the raw value when the country has no dial code on record', () => {
      expect(stripDialCodeForDisplay('+306943413781', undefined)).toBe('+306943413781')
    })
  })

  describe('dialCodeLabel', () => {
    it('renders the sticky badge text for a country with a dial code', () => {
      expect(dialCodeLabel(GR)).toBe('+30')
      expect(dialCodeLabel(CY)).toBe('+357')
    })

    it('returns an empty string when there is no country or no dial code', () => {
      expect(dialCodeLabel(undefined)).toBe('')
      expect(dialCodeLabel(null)).toBe('')
      expect(dialCodeLabel({})).toBe('')
    })
  })

  describe('resolvePhoneCountry', () => {
    const countries = [{ alpha2: 'GR', ...GR }, { alpha2: 'CY', ...CY }]

    it('returns the exact alpha2 match', () => {
      expect(resolvePhoneCountry(countries, 'CY')?.alpha2).toBe('CY')
    })

    it('returns undefined with no match and no fallback requested', () => {
      expect(resolvePhoneCountry(countries, 'DE')).toBeUndefined()
      expect(resolvePhoneCountry(countries, undefined)).toBeUndefined()
    })

    it('falls back to the first row when opted in and nothing matches', () => {
      expect(resolvePhoneCountry(countries, undefined, { fallbackToFirst: true })?.alpha2).toBe('GR')
      expect(resolvePhoneCountry(countries, 'DE', { fallbackToFirst: true })?.alpha2).toBe('GR')
    })

    it('handles an empty or missing list', () => {
      expect(resolvePhoneCountry(null, 'GR')).toBeUndefined()
      expect(resolvePhoneCountry([], 'GR', { fallbackToFirst: true })).toBeUndefined()
    })
  })
})
