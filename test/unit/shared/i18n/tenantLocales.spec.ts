import { describe, it, expect } from 'vitest'
import { servedLocale, tenantAllowedLocales } from '../../../../shared/i18n/tenantLocales'

/**
 * The per-tenant allow-list every layer reads.
 *
 * `app/middleware/locale-available.global.ts` 404s a prefix a tenant
 * does not list, the language switcher hides it, and the sitemap omits
 * it — so all three have to agree, and they agree by reading this.
 *
 * Browser-language detection is OFF platform-wide
 * (`detectBrowserLanguage: false` in `nuxt.config.ts`), so nothing can
 * route a visitor to a locale their tenant does not serve: `/` always
 * answers in the tenant's own default.
 */
describe('tenantAllowedLocales', () => {
  it('falls back to the platform list when no tenant resolved', () => {
    expect(tenantAllowedLocales(null)).toEqual(['el', 'en'])
    expect(tenantAllowedLocales(undefined)).toEqual(['el', 'en'])
  })

  it('reads the tenant allow-list when it has one', () => {
    expect(
      tenantAllowedLocales({ defaultLocale: 'el', availableLocales: ['el', 'en'] }),
    ).toEqual(['el', 'en'])
  })

  it('treats an empty allow-list as single-language on the default', () => {
    expect(
      tenantAllowedLocales({ defaultLocale: 'el', availableLocales: [] }),
    ).toEqual(['el'])
  })

  it('drops codes the platform does not build routes for', () => {
    expect(
      tenantAllowedLocales({ defaultLocale: 'el', availableLocales: ['el', 'fr'] }),
    ).toEqual(['el'])
  })
})

/**
 * `servedLocale` is the one clamp the server locale middleware and the
 * route guard share: a locale the tenant serves renders as itself, and
 * everything else renders as the unprefixed default.
 */
describe('servedLocale', () => {
  const bilingual = { defaultLocale: 'el', availableLocales: ['el', 'en'] }

  it('keeps a locale the tenant serves', () => {
    expect(servedLocale('en', bilingual)).toBe('en')
    expect(servedLocale('el', bilingual)).toBe('el')
  })

  it('resolves a missing, unknown or unserved locale to the default', () => {
    expect(servedLocale(undefined, bilingual)).toBe('el')
    expect(servedLocale('', bilingual)).toBe('el')
    expect(servedLocale('fr', bilingual)).toBe('el')
    expect(servedLocale('en', { defaultLocale: 'el' })).toBe('el')
  })

  it('always serves the default, even to a store that does not list it', () => {
    // `/` renders the build-time default on every tenant.
    expect(servedLocale('el', { defaultLocale: 'en', availableLocales: ['en'] })).toBe('el')
    expect(servedLocale('en', { defaultLocale: 'en', availableLocales: ['en'] })).toBe('en')
  })
})
