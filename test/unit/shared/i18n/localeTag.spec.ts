import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE } from '../../../../i18n/locales'
import { languageOfLocaleTag } from '../../../../shared/i18n/localeTag'

describe('languageOfLocaleTag', () => {
  it('reads the language off an hreflang', () => {
    expect(languageOfLocaleTag('en')).toBe('en')
    expect(languageOfLocaleTag('en-US')).toBe('en')
    expect(languageOfLocaleTag('el-GR')).toBe('el')
  })

  it('reads the language off an Open Graph locale', () => {
    expect(languageOfLocaleTag('en_US')).toBe('en')
    expect(languageOfLocaleTag('el_GR')).toBe('el')
  })

  it('is case-insensitive', () => {
    expect(languageOfLocaleTag('EN-us')).toBe('en')
  })

  it('resolves x-default and blanks to the default locale', () => {
    expect(languageOfLocaleTag('x-default')).toBe(DEFAULT_LOCALE)
    expect(languageOfLocaleTag('')).toBe(DEFAULT_LOCALE)
    expect(languageOfLocaleTag(undefined)).toBe(DEFAULT_LOCALE)
  })
})
