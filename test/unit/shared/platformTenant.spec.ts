import { describe, expect, it } from 'vitest'
import { isPlatformTenantHost } from '../../../shared/utils/platformTenant'

/**
 * The ONE comparison behind every "is this the platform's own
 * storefront?" gate. The platform host comes from PRIVATE runtime
 * config, so a wrong answer here either strips the platform tenant's
 * own brand or — the failure mode that matters — dresses another
 * store in it.
 */
describe('isPlatformTenantHost', () => {
  it('is true only for the tenant whose primaryDomain equals the platform host', () => {
    expect(isPlatformTenantHost('webside.gr', 'webside.gr')).toBe(true)
    expect(isPlatformTenantHost('delta-sigma.grooveshop.space', 'webside.gr')).toBe(false)
    expect(isPlatformTenantHost('www.webside.gr', 'webside.gr')).toBe(false)
  })

  it('fails CLOSED when no platform host is configured', () => {
    expect(isPlatformTenantHost('webside.gr', undefined)).toBe(false)
    expect(isPlatformTenantHost('webside.gr', null)).toBe(false)
    expect(isPlatformTenantHost('webside.gr', '')).toBe(false)
    expect(isPlatformTenantHost('webside.gr', '   ')).toBe(false)
  })

  it('counts an unset primaryDomain as platform (probes, prerender, single-tenant dev)', () => {
    expect(isPlatformTenantHost(undefined, 'webside.gr')).toBe(true)
    expect(isPlatformTenantHost(null, undefined)).toBe(true)
    expect(isPlatformTenantHost('', undefined)).toBe(true)
  })

  it('ignores a port on the configured host (dev: localhost:3000 vs a bare TenantDomain row)', () => {
    expect(isPlatformTenantHost('localhost', 'localhost:3000')).toBe(true)
    expect(isPlatformTenantHost('localhost', ' localhost ')).toBe(true)
  })
})
