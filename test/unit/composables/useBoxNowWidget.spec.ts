/**
 * Unit tests for useBoxNowWidget utility functions.
 *
 * These are pure-function tests — no Nuxt environment is required.
 * All exports are imported explicitly since the unit project does not
 * have Nuxt auto-imports.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  buildBoxNowIframeUrl,
  isBoxNowAllowedOrigin,
  parseBoxNowSelectedLocker,
  BOXNOW_ALLOWED_ORIGINS,
} from '~/composables/useBoxNowWidget'

// `log` is auto-imported in Nuxt/Nitro context but not in the unit (node)
// vitest project. Stub it so any incidental call does not crash the tests.
beforeEach(() => {
  vi.stubGlobal('log', {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })
})

// ---------------------------------------------------------------------------
// buildBoxNowIframeUrl
// ---------------------------------------------------------------------------

describe('buildBoxNowIframeUrl', () => {
  describe('defaults', () => {
    it('produces the correct URL with only partnerId supplied', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391' })
      const parsed = new URL(url)

      expect(parsed.origin).toBe('https://widget-v5.boxnow.gr')
      expect(parsed.pathname).toBe('/iframe.html')
      expect(parsed.searchParams.get('partnerId')).toBe('10391')
      expect(parsed.searchParams.get('gps')).toBe('yes')
      expect(parsed.searchParams.get('autoselect')).toBe('yes')
      expect(parsed.searchParams.get('autoclose')).toBe('no')
      expect(parsed.searchParams.get('language')).toBe('el')
    })

    it('uses "iframe" as default type (no "type" param in the URL)', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391' })
      const parsed = new URL(url)
      // The type param is included (value: 'iframe')
      expect(parsed.searchParams.get('type')).toBe('iframe')
    })
  })

  describe('with all options', () => {
    it('encodes all provided params correctly', () => {
      const url = buildBoxNowIframeUrl({
        partnerId: '10391',
        language: 'en',
        type: 'popup',
        lockerId: 'ABC-123',
        zip: '11527',
        gps: false,
        autoselect: false,
        autoclose: true,
      })
      const parsed = new URL(url)

      expect(parsed.searchParams.get('partnerId')).toBe('10391')
      expect(parsed.searchParams.get('language')).toBe('en')
      expect(parsed.searchParams.get('type')).toBe('popup')
      expect(parsed.searchParams.get('lockerId')).toBe('ABC-123')
      expect(parsed.searchParams.get('zip')).toBe('11527')
      expect(parsed.searchParams.get('gps')).toBe('no')
      expect(parsed.searchParams.get('autoselect')).toBe('no')
      expect(parsed.searchParams.get('autoclose')).toBe('yes')
    })
  })

  describe('gps option', () => {
    it('sets gps=no when gps is false', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391', gps: false })
      expect(new URL(url).searchParams.get('gps')).toBe('no')
    })

    it('sets gps=yes when gps is true', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391', gps: true })
      expect(new URL(url).searchParams.get('gps')).toBe('yes')
    })
  })

  describe('autoclose option', () => {
    it('sets autoclose=yes when autoclose is true', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391', autoclose: true })
      expect(new URL(url).searchParams.get('autoclose')).toBe('yes')
    })

    it('sets autoclose=no when autoclose is false (default)', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391' })
      expect(new URL(url).searchParams.get('autoclose')).toBe('no')
    })
  })

  describe('type option', () => {
    it('produces popup.html path equivalent when type is "popup"', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391', type: 'popup' })
      // The base path is always iframe.html — the type is passed as a query param
      const parsed = new URL(url)
      expect(parsed.pathname).toBe('/iframe.html')
      expect(parsed.searchParams.get('type')).toBe('popup')
    })
  })

  describe('partnerId validation', () => {
    it('throws when partnerId is an empty string', () => {
      expect(() => buildBoxNowIframeUrl({ partnerId: '' })).toThrow('partnerId is required')
    })

    it('throws when partnerId is null (coerced)', () => {
      // TypeScript won't allow passing null directly; use `as any` to simulate
      // a runtime null coming from an unchecked config value.
      expect(() => buildBoxNowIframeUrl({ partnerId: null as any })).toThrow('partnerId is required')
    })

    it('throws when partnerId is undefined (coerced)', () => {
      expect(() => buildBoxNowIframeUrl({ partnerId: undefined as any })).toThrow('partnerId is required')
    })
  })

  describe('optional lockerId / zip params', () => {
    it('does not include lockerId param when not provided', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391' })
      expect(new URL(url).searchParams.has('lockerId')).toBe(false)
    })

    it('includes lockerId when provided', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391', lockerId: '4' })
      expect(new URL(url).searchParams.get('lockerId')).toBe('4')
    })

    it('does not include zip param when not provided', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391' })
      expect(new URL(url).searchParams.has('zip')).toBe(false)
    })

    it('includes zip when provided', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391', zip: '12345' })
      expect(new URL(url).searchParams.get('zip')).toBe('12345')
    })
  })
})

// ---------------------------------------------------------------------------
// isBoxNowAllowedOrigin
// ---------------------------------------------------------------------------

describe('isBoxNowAllowedOrigin', () => {
  describe('explicit allowlist entries', () => {
    it.each([...BOXNOW_ALLOWED_ORIGINS])('accepts %s', (origin) => {
      expect(isBoxNowAllowedOrigin(origin)).toBe(true)
    })

    it('accepts https://widget-v5.boxnow.gr explicitly', () => {
      expect(isBoxNowAllowedOrigin('https://widget-v5.boxnow.gr')).toBe(true)
    })

    it('accepts https://widget-v5.boxnow.cy explicitly', () => {
      expect(isBoxNowAllowedOrigin('https://widget-v5.boxnow.cy')).toBe(true)
    })
  })

  describe('regex-matched origins', () => {
    it('accepts https://map.boxnow.gr', () => {
      expect(isBoxNowAllowedOrigin('https://map.boxnow.gr')).toBe(true)
    })

    it('accepts https://widget-new.boxnow.gr', () => {
      expect(isBoxNowAllowedOrigin('https://widget-new.boxnow.gr')).toBe(true)
    })

    it('accepts https://map.boxnow.cy', () => {
      expect(isBoxNowAllowedOrigin('https://map.boxnow.cy')).toBe(true)
    })

    it('accepts https://map.boxnow.bg', () => {
      expect(isBoxNowAllowedOrigin('https://map.boxnow.bg')).toBe(true)
    })
  })

  describe('rejected origins', () => {
    it('rejects https://attacker.com', () => {
      expect(isBoxNowAllowedOrigin('https://attacker.com')).toBe(false)
    })

    it('rejects http://widget-v5.boxnow.gr (HTTP, not HTTPS)', () => {
      expect(isBoxNowAllowedOrigin('http://widget-v5.boxnow.gr')).toBe(false)
    })

    it('rejects an empty string', () => {
      expect(isBoxNowAllowedOrigin('')).toBe(false)
    })

    it('rejects a URL with a path (not just origin)', () => {
      expect(isBoxNowAllowedOrigin('https://widget-v5.boxnow.gr/some/path')).toBe(false)
    })

    it('rejects a domain that only contains boxnow as a substring (not official)', () => {
      expect(isBoxNowAllowedOrigin('https://notboxnow.gr')).toBe(false)
    })

    it('rejects a malformed/partial origin', () => {
      expect(isBoxNowAllowedOrigin('widget-v5.boxnow.gr')).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// parseBoxNowSelectedLocker
// ---------------------------------------------------------------------------

describe('parseBoxNowSelectedLocker', () => {
  describe('invalid inputs', () => {
    it('returns null for null', () => {
      expect(parseBoxNowSelectedLocker(null)).toBeNull()
    })

    it('returns null for a string', () => {
      expect(parseBoxNowSelectedLocker('some string')).toBeNull()
    })

    it('returns null for a number', () => {
      expect(parseBoxNowSelectedLocker(42)).toBeNull()
    })

    it('returns null for an array', () => {
      expect(parseBoxNowSelectedLocker([])).toBeNull()
    })

    it('returns null for undefined', () => {
      expect(parseBoxNowSelectedLocker(undefined)).toBeNull()
    })
  })

  describe('missing required fields', () => {
    it('returns null when boxnowLockerId is absent', () => {
      expect(parseBoxNowSelectedLocker({
        boxnowLockerPostalCode: '12345',
        boxnowLockerAddressLine1: 'Street 1',
      })).toBeNull()
    })

    it('returns null when boxnowLockerPostalCode is absent', () => {
      expect(parseBoxNowSelectedLocker({
        boxnowLockerId: '4',
        boxnowLockerAddressLine1: 'Street 1',
      })).toBeNull()
    })

    it('returns null when boxnowLockerAddressLine1 is absent', () => {
      expect(parseBoxNowSelectedLocker({
        boxnowLockerId: '4',
        boxnowLockerPostalCode: '12345',
      })).toBeNull()
    })

    it('returns null when boxnowLockerId is an empty string', () => {
      expect(parseBoxNowSelectedLocker({
        boxnowLockerId: '',
        boxnowLockerPostalCode: '12345',
        boxnowLockerAddressLine1: 'Street 1',
      })).toBeNull()
    })

    it('returns null when boxnowLockerPostalCode is an empty string', () => {
      expect(parseBoxNowSelectedLocker({
        boxnowLockerId: '4',
        boxnowLockerPostalCode: '',
        boxnowLockerAddressLine1: 'Street 1',
      })).toBeNull()
    })
  })

  describe('valid minimal input', () => {
    it('returns the normalised locker object for the three required fields', () => {
      const result = parseBoxNowSelectedLocker({
        boxnowLockerId: '4',
        boxnowLockerPostalCode: '15234',
        boxnowLockerAddressLine1: 'Λεωφ. Πεντέλης 125',
      })

      expect(result).not.toBeNull()
      expect(result!.boxnowLockerId).toBe('4')
      expect(result!.boxnowLockerPostalCode).toBe('15234')
      expect(result!.boxnowLockerAddressLine1).toBe('Λεωφ. Πεντέλης 125')
    })

    it('does not include optional fields when they are absent', () => {
      const result = parseBoxNowSelectedLocker({
        boxnowLockerId: '4',
        boxnowLockerPostalCode: '15234',
        boxnowLockerAddressLine1: 'Λεωφ. Πεντέλης 125',
      })

      expect(result).not.toBeNull()
      expect(result!.boxnowLockerAddressLine2).toBeUndefined()
      expect(result!.boxnowLockerName).toBeUndefined()
      expect(result!.boxnowLockerNote).toBeUndefined()
      expect(result!.boxnowLockerLat).toBeUndefined()
      expect(result!.boxnowLockerLng).toBeUndefined()
      expect(result!.boxnowLockerImage).toBeUndefined()
    })
  })

  describe('valid input with all optional fields', () => {
    it('includes all optional fields when present and non-empty', () => {
      const payload = {
        boxnowLockerId: '4',
        boxnowLockerPostalCode: '15234',
        boxnowLockerAddressLine1: 'Λεωφ. Πεντέλης 125',
        boxnowLockerAddressLine2: 'ΟΠΑΠ Play',
        boxnowLockerName: 'Χαλάνδρι ΟΠΑΠ Play',
        boxnowLockerNote: 'Είσοδος από την πλευρά της στάσης',
        boxnowLockerLat: '38.0123',
        boxnowLockerLng: '23.8123',
        boxnowLockerImage: 'https://cdn.boxnow.gr/locker4.jpg',
      }

      const result = parseBoxNowSelectedLocker(payload)

      expect(result).not.toBeNull()
      expect(result!.boxnowLockerId).toBe('4')
      expect(result!.boxnowLockerPostalCode).toBe('15234')
      expect(result!.boxnowLockerAddressLine1).toBe('Λεωφ. Πεντέλης 125')
      expect(result!.boxnowLockerAddressLine2).toBe('ΟΠΑΠ Play')
      expect(result!.boxnowLockerName).toBe('Χαλάνδρι ΟΠΑΠ Play')
      expect(result!.boxnowLockerNote).toBe('Είσοδος από την πλευρά της στάσης')
      expect(result!.boxnowLockerLat).toBe('38.0123')
      expect(result!.boxnowLockerLng).toBe('23.8123')
      expect(result!.boxnowLockerImage).toBe('https://cdn.boxnow.gr/locker4.jpg')
    })

    it('excludes optional fields that are empty strings even when key is present', () => {
      const result = parseBoxNowSelectedLocker({
        boxnowLockerId: '4',
        boxnowLockerPostalCode: '15234',
        boxnowLockerAddressLine1: 'Λεωφ. Πεντέλης 125',
        boxnowLockerName: '',
        boxnowLockerNote: '',
      })

      expect(result).not.toBeNull()
      expect(result!.boxnowLockerName).toBeUndefined()
      expect(result!.boxnowLockerNote).toBeUndefined()
    })
  })
})
