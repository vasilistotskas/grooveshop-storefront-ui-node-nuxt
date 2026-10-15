import { describe, expect, it } from 'vitest'

import {
  isFundingBanner,
  parseFundingBannerValue,
} from '../../../../shared/schemas/fundingBanner'

/**
 * The render-time mirror of Django's validator for `FUNDING_BANNER`: a
 * shape the write side refuses must be refused here too, and one it
 * accepts must render.
 */
const banner = (extra: Record<string, unknown> = {}) => ({
  enabled: true,
  image: '/media/espa/banner.png',
  alt: 'Με τη συγχρηματοδότηση της Ευρωπαϊκής Ένωσης',
  link: '/chrimatodotisi',
  ...extra,
})

describe('isFundingBanner', () => {
  it('accepts a full banner, with or without a label', () => {
    expect(isFundingBanner(banner())).toBe(true)
    expect(isFundingBanner(banner({ label: 'Δείτε την πράξη' }))).toBe(true)
  })

  it('accepts a disabled banner that says nothing else', () => {
    expect(isFundingBanner({ enabled: false })).toBe(true)
  })

  it.each([
    ['a relative path', '/chrimatodotisi'],
    ['an https URL', 'https://example.com/espa'],
  ])('accepts %s as the link and the image', (_name, url) => {
    expect(isFundingBanner(banner({ link: url, image: url }))).toBe(true)
  })

  it.each([
    ['plain http', 'http://example.com/a.png'],
    ['protocol-relative', '//example.com/a.png'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a bare relative path', 'media/a.png'],
    ['too long', `/${'a'.repeat(1000)}`],
    ['not a string', 7],
  ])('refuses an image or link that is %s', (_name, url) => {
    expect(isFundingBanner(banner({ image: url }))).toBe(false)
    expect(isFundingBanner(banner({ link: url }))).toBe(false)
  })

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['blank', '   '],
  ])('refuses an enabled banner whose alt is %s', (_name, alt) => {
    expect(isFundingBanner(banner({ alt }))).toBe(false)
  })

  it('does not ask a disabled banner for an alt', () => {
    expect(isFundingBanner(banner({ enabled: false, alt: undefined }))).toBe(true)
  })

  it('refuses a missing or non-boolean enabled flag', () => {
    expect(isFundingBanner({ image: '/a.png', alt: 'x' })).toBe(false)
    expect(isFundingBanner(banner({ enabled: 'true' }))).toBe(false)
  })

  it('accepts the artwork\'s intrinsic size', () => {
    expect(isFundingBanner(banner({ width: 1800, height: 197 }))).toBe(true)
  })

  it.each<[Record<string, unknown>, string]>([
    [{ width: 1800 }, 'a width without a height'],
    [{ height: 197 }, 'a height without a width'],
    [{ width: 0, height: 197 }, 'a zero width'],
    [{ width: 1800, height: -1 }, 'a negative height'],
    [{ width: 1800.5, height: 197 }, 'a fractional width'],
    [{ width: '1800', height: '197' }, 'sizes as text'],
    [{ width: 10001, height: 197 }, 'a width past any artwork'],
  ])('refuses %j (%s)', (size) => {
    expect(isFundingBanner(banner(size))).toBe(false)
  })

  it('refuses a key it does not know', () => {
    expect(isFundingBanner(banner({ color: 'red' }))).toBe(false)
  })

  it.each([null, 'text', 7, []])('refuses %j', (value) => {
    expect(isFundingBanner(value)).toBe(false)
  })
})

describe('parseFundingBannerValue', () => {
  it('returns the banner for a valid JSON string', () => {
    expect(parseFundingBannerValue(JSON.stringify(banner()))).toEqual(banner())
  })

  it.each(['', '{', '[]', '{"enabled":true}', '{"enabled":true,"alt":"x","size":1}'])(
    'returns null for %j',
    (raw) => {
      expect(parseFundingBannerValue(raw)).toBeNull()
    },
  )
})
