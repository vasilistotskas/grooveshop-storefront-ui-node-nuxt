import { describe, expect, it } from 'vitest'

import {
  isFundingBanner,
  localizedFundingBanner,
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
  width: 1800,
  height: 197,
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

  // Without its size the artwork's box cannot be reserved, and the
  // strip pushes every page down as it loads.
  it.each<[Record<string, unknown>, string]>([
    [{ height: undefined }, 'an artwork with no height'],
    [{ width: undefined }, 'an artwork with no width'],
    [{ width: undefined, height: undefined }, 'an artwork with no size'],
    [{ width: 0 }, 'a zero width'],
    [{ height: -1 }, 'a negative height'],
    [{ width: 1800.5 }, 'a fractional width'],
    [{ width: '1800', height: '197' }, 'sizes as text'],
    [{ width: 10001 }, 'a width past any artwork'],
  ])('refuses %j (%s)', (size) => {
    expect(isFundingBanner(banner(size))).toBe(false)
  })

  it('refuses a size without an artwork', () => {
    expect(isFundingBanner({ enabled: true, alt: 'x', label: 'Δείτε την πράξη', width: 1800, height: 197 })).toBe(false)
  })

  it('needs no size for a banner without an artwork', () => {
    expect(isFundingBanner({ enabled: true, alt: 'x', label: 'Δείτε την πράξη', link: '/chrimatodotisi' })).toBe(true)
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

const ENGLISH = {
  image: '/media/espa/banner-en.png',
  width: 1920,
  height: 234,
  alt: 'Co-funded by the European Union',
  label: 'See the operation',
}

describe('the per-locale overlay', () => {
  it('accepts a locale that replaces the artwork and the words', () => {
    expect(isFundingBanner(banner({ i18n: { en: ENGLISH } }))).toBe(true)
  })

  it.each(['alt', 'label'] as const)('accepts a locale that overrides its %s alone', (key) => {
    expect(isFundingBanner(banner({ i18n: { en: { [key]: ENGLISH[key] } } }))).toBe(true)
  })

  it.each(['image', 'width', 'height'] as const)(
    'refuses a localized artwork without its %s: the box of another picture would be drawn',
    (missing) => {
      const { [missing]: _dropped, ...rest } = ENGLISH
      expect(isFundingBanner(banner({ i18n: { en: rest } }))).toBe(false)
    },
  )

  it('refuses a localized artwork without its own alt: the default describes another picture', () => {
    const { alt: _dropped, ...rest } = ENGLISH
    expect(isFundingBanner(banner({ i18n: { en: rest } }))).toBe(false)
  })

  it.each([
    ['the link', { link: '/elsewhere' }],
    ['the switch', { enabled: false }],
    ['an unknown key', { color: 'red' }],
    ['a blank alt', { alt: '   ' }],
    ['an http artwork', { image: 'http://example.com/en.png' }],
  ])('refuses a locale that overrides %s', (_name, extra) => {
    expect(isFundingBanner(banner({ i18n: { en: { ...ENGLISH, ...extra } } }))).toBe(false)
  })

  it.each([[{ en: {} }], [{ en: 'Co-funded' }], [['en']], ['en']])('refuses the overlay %j', (i18n) => {
    expect(isFundingBanner(banner({ i18n }))).toBe(false)
  })
})

describe('localizedFundingBanner', () => {
  it('lays the artwork and words of the locale over the default and drops the overlay', () => {
    const value = { ...banner({ label: 'Δείτε την πράξη' }), i18n: { en: ENGLISH } }

    expect(localizedFundingBanner(value, 'en')).toEqual({
      enabled: true,
      link: '/chrimatodotisi',
      ...ENGLISH,
    })
  })

  it('keeps the default artwork when the locale overrides only its words', () => {
    const value = { ...banner(), i18n: { en: { alt: ENGLISH.alt } } }

    expect(localizedFundingBanner(value, 'en')).toEqual({ ...banner(), alt: ENGLISH.alt })
  })

  it('renders the default for a locale without an override', () => {
    expect(localizedFundingBanner({ ...banner(), i18n: { en: ENGLISH } }, 'el')).toEqual(banner())
  })
})
