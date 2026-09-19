import { describe, it, expect } from 'vitest'
import { tenantAllowedLocales } from '../../../../shared/i18n/tenantLocales'

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
