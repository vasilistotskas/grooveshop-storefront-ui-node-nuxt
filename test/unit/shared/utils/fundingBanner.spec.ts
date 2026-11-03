import { describe, expect, it } from 'vitest'
import { localizedFundingBanner } from '~~/shared/utils/fundingBanner'

const banner = (extra: Partial<FundingBanner> = {}): FundingBanner => ({
  enabled: true,
  image: '/media/espa/banner.png',
  width: 1800,
  height: 197,
  alt: 'Με τη συγχρηματοδότηση της Ευρωπαϊκής Ένωσης',
  link: '/chrimatodotisi',
  ...extra,
})

const ENGLISH = {
  image: '/media/espa/banner-en.png',
  width: 1920,
  height: 234,
  alt: 'Co-funded by the European Union',
  label: 'See the operation',
}

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
