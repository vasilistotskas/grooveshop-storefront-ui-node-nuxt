import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE } from '~~/i18n/locales'
import { pageLocale, requestLocale } from '~~/server/utils/locale'
import { createTestEvent } from '~~/test/helpers/nitro'

describe('pageLocale', () => {
  const store = { availableLocales: ['el', 'en'] }

  it.each([
    ['a page path\'s prefix', '/en/products', undefined, 'en'],
    ['an unprefixed page, in the default', '/products', 'en', DEFAULT_LOCALE],
    ['the X-Language of an /api call', '/api/products', 'en', 'en'],
    ['the default for an /api call without one', '/api/products', undefined, DEFAULT_LOCALE],
  ] as const)('is %s', (_name, path, header, expected) => {
    expect(pageLocale(path, header, store)).toBe(expected)
  })

  it('is the default for a locale the store does not serve', () => {
    expect(pageLocale('/en/products', undefined, { availableLocales: ['el'] })).toBe(DEFAULT_LOCALE)
  })
})

describe('requestLocale', () => {
  it('reads the locale 1.locale.ts resolved for the request', () => {
    expect(requestLocale(createTestEvent({ context: { locale: 'en' } }))).toBe('en')
  })

  it('answers the default locale where the middleware does not run (/_nuxt, /_ipx, /assets)', () => {
    expect(requestLocale(createTestEvent())).toBe(DEFAULT_LOCALE)
  })
})
