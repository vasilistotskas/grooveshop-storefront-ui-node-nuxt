import { describe, it, expect } from 'vitest'
import {
  normalizeGreekPhone,
  stripGreekPrefixForDisplay,
  isPlausiblePhone,
} from '~/utils/phone'

describe('Phone Utilities', () => {
  describe('normalizeGreekPhone', () => {
    it('prefixes bare Greek local numbers with +30', () => {
      expect(normalizeGreekPhone('6943413781')).toBe('+306943413781')
      expect(normalizeGreekPhone('2101234567')).toBe('+302101234567')
    })

    it('handles the country code typed without "+" (the checkout bug)', () => {
      // A user typed "306943413781" next to the sticky "+30" badge —
      // this used to produce the invalid "+30306943413781".
      expect(normalizeGreekPhone('306943413781')).toBe('+306943413781')
      expect(normalizeGreekPhone('30 694 341 3781')).toBe('+306943413781')
      expect(normalizeGreekPhone('0306943413781')).toBe('+306943413781')
    })

    it('does not treat a short number starting with 30 as a country code', () => {
      // 10 digits starting "30" is not a valid Greek number either way,
      // but it must not be silently rewritten into a different number.
      expect(normalizeGreekPhone('3069434137')).toBe('+303069434137')
    })

    it('passes through numbers that already carry a prefix', () => {
      expect(normalizeGreekPhone('+306943413781')).toBe('+306943413781')
      expect(normalizeGreekPhone('00306943413781')).toBe('+306943413781')
      expect(normalizeGreekPhone('+447911123456')).toBe('+447911123456')
    })

    it('strips whitespace, dashes, and parens', () => {
      expect(normalizeGreekPhone('694 341-3781')).toBe('+306943413781')
      expect(normalizeGreekPhone('(210) 123-4567')).toBe('+302101234567')
    })

    it('strips a single leading zero from domestic notation', () => {
      expect(normalizeGreekPhone('02111234567')).toBe('+302111234567')
    })

    it('returns empty string for empty input', () => {
      expect(normalizeGreekPhone('')).toBe('')
      expect(normalizeGreekPhone(null)).toBe('')
      expect(normalizeGreekPhone(undefined)).toBe('')
      expect(normalizeGreekPhone('  ')).toBe('')
    })
  })

  describe('isPlausiblePhone', () => {
    it('accepts valid Greek mobiles and landlines in any typed form', () => {
      expect(isPlausiblePhone('6943413781')).toBe(true)
      expect(isPlausiblePhone('2101234567')).toBe(true)
      expect(isPlausiblePhone('+306943413781')).toBe(true)
      expect(isPlausiblePhone('306943413781')).toBe(true)
      expect(isPlausiblePhone('694 341 3781')).toBe(true)
    })

    it('accepts every other assigned Greek range (verified vs phonenumbers 9.0.36)', () => {
      expect(isPlausiblePhone('9412345678')).toBe(true) // newer mobile range
      expect(isPlausiblePhone('6857123456')).toBe(true) // 68x mobile range
      expect(isPlausiblePhone('8001234567')).toBe(true) // toll-free
      expect(isPlausiblePhone('8011234567')).toBe(true) // shared-cost
      expect(isPlausiblePhone('9091234567')).toBe(true) // premium
      expect(isPlausiblePhone('7012345678')).toBe(true) // personal number
      expect(isPlausiblePhone('5005000123')).toBe(true) // corporate UAN
      expect(isPlausiblePhone('80012345678')).toBe(true) // 11-digit toll-free
    })

    it('rejects Greek numbers with wrong length or unassigned leading digit', () => {
      expect(isPlausiblePhone('69434')).toBe(false)
      expect(isPlausiblePhone('69434137811')).toBe(false)
      expect(isPlausiblePhone('1234567890')).toBe(false) // 1x unassigned
      expect(isPlausiblePhone('4001234567')).toBe(false) // 4x unassigned
      expect(isPlausiblePhone('3069434137')).toBe(false) // 3x unassigned
      // The exact pre-fix failure mode: "+3030…" double country code
      expect(isPlausiblePhone('+30306943413781')).toBe(false)
    })

    it('is lenient with foreign international numbers', () => {
      expect(isPlausiblePhone('+447911123456')).toBe(true)
      expect(isPlausiblePhone('+4915112345678')).toBe(true)
    })

    it('rejects implausibly short or empty values', () => {
      expect(isPlausiblePhone('+1')).toBe(false)
      expect(isPlausiblePhone('')).toBe(false)
      expect(isPlausiblePhone(null)).toBe(false)
      expect(isPlausiblePhone(undefined)).toBe(false)
    })
  })

  describe('stripGreekPrefixForDisplay', () => {
    it('strips the +30 prefix for display next to the badge', () => {
      expect(stripGreekPrefixForDisplay('+306943413781')).toBe('6943413781')
      expect(stripGreekPrefixForDisplay('00306943413781')).toBe('6943413781')
    })

    it('leaves foreign numbers and empty values untouched', () => {
      expect(stripGreekPrefixForDisplay('+447911123456')).toBe('+447911123456')
      expect(stripGreekPrefixForDisplay('')).toBe('')
      expect(stripGreekPrefixForDisplay(undefined)).toBe('')
    })
  })
})
