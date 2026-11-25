import { describe, expect, it } from 'vitest'
import { el, en } from '@nuxt/ui/locale'
import { DEFAULT_LOCALE, LOCALE_PROPERTIES, SUPPORTED_LOCALES } from '~~/i18n/locales'
import { toUiLocales } from '~/utils/uiLocales'

/** Nuxt UI's own locale of each supported locale: the names must agree with it. */
const NUXT_UI_LOCALES = { el, en }

describe('LOCALE_PROPERTIES', () => {
  it('describes every supported locale, the default (el) included', () => {
    expect(Object.keys(LOCALE_PROPERTIES)).toEqual([...SUPPORTED_LOCALES])
    expect(DEFAULT_LOCALE).toBe('el')
  })

  it.each(SUPPORTED_LOCALES)('names %s as Nuxt UI names it, in its own direction', (code) => {
    expect(LOCALE_PROPERTIES[code].name).toBe(NUXT_UI_LOCALES[code].name)
    expect(LOCALE_PROPERTIES[code].dir).toBe(NUXT_UI_LOCALES[code].dir)
  })
})

describe('toUiLocales', () => {
  it('maps each supported code to its Nuxt UI locale: code, name and direction', () => {
    expect(toUiLocales(['el', 'en'])).toEqual([
      { code: 'el', name: 'Ελληνικά', dir: 'ltr', messages: {} },
      { code: 'en', name: 'English', dir: 'ltr', messages: {} },
    ])
  })

  it('keeps the order it is given and leaves out a code the platform does not ship', () => {
    expect(toUiLocales(['en', 'de', 'el']).map(locale => locale.code)).toEqual(['en', 'el'])
    expect(toUiLocales([])).toEqual([])
  })
})
