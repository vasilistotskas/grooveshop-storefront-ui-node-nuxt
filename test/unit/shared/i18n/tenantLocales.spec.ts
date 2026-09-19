import { describe, it, expect } from 'vitest'
import {
  tenantAllowedLocales,
  tenantDetectsBrowserLocale,
} from '../../../../shared/i18n/tenantLocales'

/**
 * The allow-list every layer reads, and the one decision that follows
 * from it.
 *
 * `tenantDetectsBrowserLocale` exists because of a live 404: a
 * Greek-only store answered its own homepage with an error page for
 * every visitor whose browser asked for English. @nuxtjs/i18n matched
 * `navigator.languages` against the build-time locale list — which
 * knows nothing about `Tenant.available_locales` — resolved `en`, and
 * redirected `/` to `/en`, where `locale-available.global.ts` 404s.
 * Reproduced on production `demo.grooveshop.space` and on staging,
 * from a cookie-free browsing context, 2026-09-19.
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

describe('tenantDetectsBrowserLocale', () => {
  it('is off for a store that serves only the default locale', () => {
    // The bug: detection resolved `en` here and redirected / to /en.
    expect(
      tenantDetectsBrowserLocale({ defaultLocale: 'el', availableLocales: [] }, 'el'),
    ).toBe(false)
    expect(
      tenantDetectsBrowserLocale({ defaultLocale: 'el', availableLocales: ['el'] }, 'el'),
    ).toBe(false)
  })

  it('stays on for a bilingual store', () => {
    expect(
      tenantDetectsBrowserLocale({ defaultLocale: 'el', availableLocales: ['el', 'en'] }, 'el'),
    ).toBe(true)
  })

  it('stays on for a store whose single locale needs a prefix', () => {
    // `/` cannot render `en` under prefix_except_default, so the
    // redirect onto /en is the only way there — and the route guard
    // allows that prefix for this tenant.
    expect(
      tenantDetectsBrowserLocale({ defaultLocale: 'en', availableLocales: ['en'] }, 'el'),
    ).toBe(true)
  })

  it('stays on when no tenant resolved, like the allow-list', () => {
    // Fail-open: a resolution failure must not strip a store of a
    // language it does serve.
    expect(tenantDetectsBrowserLocale(null, 'el')).toBe(true)
  })
})
