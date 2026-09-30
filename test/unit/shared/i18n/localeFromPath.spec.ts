import { describe, it, expect } from 'vitest'
import { localeFromPath, splitLocale } from '~~/shared/i18n/localeFromPath'

/**
 * Under `prefix_except_default` the URL carries the locale, so the
 * global route middleware reads it off the path — `useI18n()` there is
 * what 500'd every page of every tenant on v3.168.0–v3.170.1. The
 * prefix has to be a locale the platform builds (`el`, `en`), or a
 * two-letter top-level route would read as one.
 */
describe('splitLocale', () => {
  it.each([
    ['/en', { locale: 'en', route: '/' }],
    ['/en/', { locale: 'en', route: '/' }],
    ['/en/products', { locale: 'en', route: '/products' }],
    ['/en/products/', { locale: 'en', route: '/products' }],
    ['/EN/products', { locale: 'en', route: '/products' }],
    // A region subtag on a built locale still names that locale.
    ['/en-us/products', { locale: 'en', route: '/products' }],
  ])('reads the prefixed locale of %s', (path, expected) => {
    expect(splitLocale(path)).toEqual(expected)
  })

  it.each([
    ['/', { locale: 'el', route: '/' }],
    ['/products', { locale: 'el', route: '/products' }],
    // Two letters that are not a built locale are a route, not a prefix.
    ['/eu/policy', { locale: 'el', route: '/eu/policy' }],
    ['/fr/products', { locale: 'el', route: '/fr/products' }],
    // A route that merely STARTS with a locale's letters.
    ['/english', { locale: 'el', route: '/english' }],
    ['/el/', { locale: 'el', route: '/' }],
  ])('reads %s as the default locale', (path, expected) => {
    expect(splitLocale(path)).toEqual(expected)
  })
})

describe('localeFromPath', () => {
  it('is the locale half of splitLocale', () => {
    expect(localeFromPath('/en/cart')).toBe('en')
    expect(localeFromPath('/cart')).toBe('el')
  })
})
