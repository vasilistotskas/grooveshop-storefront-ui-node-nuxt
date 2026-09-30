import { describe, it, expect, beforeEach } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import localeAvailable from '~/middleware/locale-available.global'
import { useTenantStore } from '~/stores/tenant'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * Routes for every platform locale exist on every store; this gate is
 * what makes a prefix the tenant does not serve a 404. Its predecessor
 * read the locale through `useI18n()` and 500'd every page (v3.168.0),
 * so it is exercised here through the real router, outside a component.
 * `servedLocale` itself is unit-tested in
 * test/unit/shared/i18n/tenantLocales.spec.ts.
 */
function run(path: string) {
  const to = useRouter().resolve(path) as unknown as RouteLocationNormalized
  return () => localeAvailable(to, to)
}

describe('locale-available.global middleware', () => {
  beforeEach(() => {
    setTenant({ defaultLocale: 'el', availableLocales: ['el'] })
  })

  it('404s a prefix the tenant does not serve, naming the locale', () => {
    expect(run('/en/products?page=2')).toThrow(expect.objectContaining({
      statusCode: 404,
      data: { locale: 'en', path: '/en/products?page=2' },
    }))
  })

  it('404s the bare prefix too', () => {
    expect(run('/en')).toThrow(expect.objectContaining({ statusCode: 404 }))
  })

  it('serves the unprefixed default locale', () => {
    expect(run('/products')()).toBeUndefined()
  })

  it('serves a prefix the tenant lists', () => {
    setTenant({ defaultLocale: 'el', availableLocales: ['el', 'en'] })

    expect(run('/en/products')()).toBeUndefined()
  })

  it('fails open while the tenant is unresolved', () => {
    useTenantStore().setConfig(null)

    expect(run('/en/products')()).toBeUndefined()
  })
})
