/**
 * The BoxNow widget helpers (`shared/utils/boxnow-widget.ts`): the
 * iframe URL, the postMessage origin check and the parse of the
 * locker the widget posts back.
 */

import { describe, it, expect } from 'vitest'
import {
  buildBoxNowIframeUrl,
  isBoxNowAllowedOrigin,
  parseBoxNowSelectedLocker,
  widgetLanguageForLocale,
  BOXNOW_ALLOWED_ORIGINS,
  BOXNOW_FRAME_ORIGINS,
} from '~~/shared/utils/boxnow-widget'

// ---------------------------------------------------------------------------
// buildBoxNowIframeUrl
// ---------------------------------------------------------------------------

describe('buildBoxNowIframeUrl', () => {
  describe('defaults (GR)', () => {
    it('produces the correct URL with only partnerId + countryCode supplied', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391', countryCode: 'GR' })
      const parsed = new URL(url)

      expect(parsed.origin).toBe('https://widget-v5.boxnow.gr')
      expect(parsed.pathname).toBe('/iframe.html')
      expect(parsed.searchParams.get('partnerId')).toBe('10391')
      expect(parsed.searchParams.get('countryCode')).toBe('gr')
      expect(parsed.searchParams.get('gps')).toBe('yes')
      expect(parsed.searchParams.get('autoselect')).toBe('yes')
      expect(parsed.searchParams.get('autoclose')).toBe('no')
      expect(parsed.searchParams.get('language')).toBe('el')
    })

    it('uses "iframe" as default type (no "type" param in the URL)', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391', countryCode: 'GR' })
      const parsed = new URL(url)
      // The type param is included (value: 'iframe')
      expect(parsed.searchParams.get('type')).toBe('iframe')
    })
  })

  describe('CY', () => {
    it('resolves the CY widget host and countryCode param', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391', countryCode: 'CY' })
      const parsed = new URL(url)

      expect(parsed.origin).toBe('https://widget-v5.boxnow.cy')
      expect(parsed.searchParams.get('countryCode')).toBe('cy')
    })

    it('is case-insensitive on the countryCode option', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391', countryCode: 'cy' })
      expect(new URL(url).origin).toBe('https://widget-v5.boxnow.cy')
    })
  })

  describe('unsupported country', () => {
    it('throws for a country with no widget mapping', () => {
      expect(() => buildBoxNowIframeUrl({ partnerId: '10391', countryCode: 'BG' }))
        .toThrow('Unsupported BoxNow country: BG')
      expect(() => buildBoxNowIframeUrl({ partnerId: '10391', countryCode: 'DE' }))
        .toThrow('Unsupported BoxNow country: DE')
    })
  })

  describe('with all options', () => {
    it('encodes all provided params correctly', () => {
      const url = buildBoxNowIframeUrl({
        partnerId: '10391',
        countryCode: 'GR',
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
      const url = buildBoxNowIframeUrl({ partnerId: '10391', countryCode: 'GR', gps: false })
      expect(new URL(url).searchParams.get('gps')).toBe('no')
    })

    it('sets gps=yes when gps is true', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391', countryCode: 'GR', gps: true })
      expect(new URL(url).searchParams.get('gps')).toBe('yes')
    })
  })

  describe('autoclose option', () => {
    it('sets autoclose=yes when autoclose is true', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391', countryCode: 'GR', autoclose: true })
      expect(new URL(url).searchParams.get('autoclose')).toBe('yes')
    })

    it('sets autoclose=no when autoclose is false (default)', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391', countryCode: 'GR' })
      expect(new URL(url).searchParams.get('autoclose')).toBe('no')
    })
  })

  describe('type option', () => {
    it('produces popup.html path equivalent when type is "popup"', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391', countryCode: 'GR', type: 'popup' })
      // The base path is always iframe.html — the type is passed as a query param
      const parsed = new URL(url)
      expect(parsed.pathname).toBe('/iframe.html')
      expect(parsed.searchParams.get('type')).toBe('popup')
    })
  })

  describe('partnerId validation', () => {
    it('throws when partnerId is an empty string', () => {
      expect(() => buildBoxNowIframeUrl({ partnerId: '', countryCode: 'GR' })).toThrow('partnerId is required')
    })

    it('throws when partnerId is null (coerced)', () => {
      // TypeScript won't allow passing null directly; use `as any` to simulate
      // a runtime null coming from an unchecked config value.
      expect(() => buildBoxNowIframeUrl({ partnerId: null as any, countryCode: 'GR' })).toThrow('partnerId is required')
    })

    it('throws when partnerId is undefined (coerced)', () => {
      expect(() => buildBoxNowIframeUrl({ partnerId: undefined as any, countryCode: 'GR' })).toThrow('partnerId is required')
    })
  })

  describe('optional lockerId / zip params', () => {
    it('does not include lockerId param when not provided', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391', countryCode: 'GR' })
      expect(new URL(url).searchParams.has('lockerId')).toBe(false)
    })

    it('includes lockerId when provided', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391', countryCode: 'GR', lockerId: '4' })
      expect(new URL(url).searchParams.get('lockerId')).toBe('4')
    })

    it('does not include zip param when not provided', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391', countryCode: 'GR' })
      expect(new URL(url).searchParams.has('zip')).toBe(false)
    })

    it('includes zip when provided', () => {
      const url = buildBoxNowIframeUrl({ partnerId: '10391', countryCode: 'GR', zip: '12345' })
      expect(new URL(url).searchParams.get('zip')).toBe('12345')
    })
  })
})

// ---------------------------------------------------------------------------
// widgetLanguageForLocale
// ---------------------------------------------------------------------------

describe('widgetLanguageForLocale', () => {
  // Verified 2026-09-27 against widget-v5.boxnow.gr/functions/loadTranslations.js
  // and globalState.js: `language` is read verbatim as `languageIs`, then
  // aliased ({el: 'gr', cy: 'gr', sl: 'si'}) and checked against the
  // widget's known set (en/gr/bg/hr/si); anything else falls back to
  // English inside the widget itself.
  it('passes "el" straight through (aliases to the widget\'s Greek copy)', () => {
    expect(widgetLanguageForLocale('el')).toBe('el')
  })

  it('passes "en" straight through (already a known widget language)', () => {
    expect(widgetLanguageForLocale('en')).toBe('en')
  })

  it('defaults an unrecognised locale to "el"', () => {
    expect(widgetLanguageForLocale('de')).toBe('el')
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

    it('derives from the same list the CSP builder uses (BOXNOW_FRAME_ORIGINS)', () => {
      expect([...BOXNOW_ALLOWED_ORIGINS].sort()).toEqual([...BOXNOW_FRAME_ORIGINS].sort())
    })
  })

  // bg/hr were unverified guesses, dropped in favour of only listing
  // markets confirmed live (GR, CY).
  describe('dropped unverified origins', () => {
    it('rejects https://widget-v5.boxnow.bg', () => {
      expect(isBoxNowAllowedOrigin('https://widget-v5.boxnow.bg')).toBe(false)
    })

    it('rejects https://widget-v5.boxnow.hr', () => {
      expect(isBoxNowAllowedOrigin('https://widget-v5.boxnow.hr')).toBe(false)
    })
  })

  // The regex fallback for ``map.boxnow.*`` and ``widget-new.boxnow.*``
  // was removed — those subdomains are not listed in the CSP
  // ``frame-src`` so they cannot host an iframe on our page anyway.
  describe('previously-regex-matched origins (now rejected)', () => {
    it('rejects https://map.boxnow.gr (no longer an iframe origin)', () => {
      expect(isBoxNowAllowedOrigin('https://map.boxnow.gr')).toBe(false)
    })

    it('rejects https://widget-new.boxnow.gr (not in CSP frame-src)', () => {
      expect(isBoxNowAllowedOrigin('https://widget-new.boxnow.gr')).toBe(false)
    })

    it('rejects https://widget-v1.boxnow.gr (legacy version not loaded)', () => {
      expect(isBoxNowAllowedOrigin('https://widget-v1.boxnow.gr')).toBe(false)
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
      expect(result!.boxnowLockerCountryCode).toBeUndefined()
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

  describe('boxnowCountry (the ISO alpha-2 of the locker record)', () => {
    // Shapes copied from the live widget: ``markerClicked.js`` posts the
    // locker record's own ``country`` field.
    it('keeps "GR" from a Greek locker', () => {
      const result = parseBoxNowSelectedLocker({
        boxnowLockerId: '4',
        boxnowLockerPostalCode: '15234',
        boxnowLockerAddressLine1: 'Λεωφόρος Πεντέλης 125',
        boxnowCountry: 'GR',
      })
      expect(result?.boxnowLockerCountryCode).toBe('GR')
    })

    it('keeps "CY" from a Cypriot locker', () => {
      const result = parseBoxNowSelectedLocker({
        boxnowLockerId: '5795',
        boxnowLockerPostalCode: '7104',
        boxnowLockerAddressLine1: 'Λεωφόρος Κυρ. Μάτση 25',
        boxnowCountry: 'CY',
      })
      expect(result?.boxnowLockerCountryCode).toBe('CY')
    })

    it('upper-cases a lower-case code', () => {
      const result = parseBoxNowSelectedLocker({
        boxnowLockerId: '5795',
        boxnowLockerPostalCode: '7104',
        boxnowLockerAddressLine1: 'Λεωφόρος Κυρ. Μάτση 25',
        boxnowCountry: 'cy',
      })
      expect(result?.boxnowLockerCountryCode).toBe('CY')
    })

    it.each(['BG', 'greece', ''])('omits the field for %j', (country) => {
      const result = parseBoxNowSelectedLocker({
        boxnowLockerId: '4',
        boxnowLockerPostalCode: '15234',
        boxnowLockerAddressLine1: 'Λεωφόρος Πεντέλης 125',
        boxnowCountry: country,
      })
      expect(result?.boxnowLockerCountryCode).toBeUndefined()
    })
  })
})
