import { describe, it, expect, beforeEach } from 'vitest'
import tenantPlugin from '~/plugins/tenant'
import { useTenantStore } from '~/stores/tenant'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'

/**
 * The tenant resolved on the server (`event.context.tenant`) travels
 * to the client in the `tenant` payload state; this plugin hydrates
 * the tenant store from it as soon as Pinia exists, before any route
 * middleware reads a plan flag. The server half — copying the request's
 * tenant into the state and rewriting i18n's baseUrl — runs only under
 * `import.meta.server`, which is false here. Every e2e render goes
 * through it, but nothing asserts the baseUrl rewrite yet.
 */
const hooks = (tenantPlugin as unknown as { hooks: { 'app:created': () => void } }).hooks

describe('tenant plugin', () => {
  beforeEach(() => {
    useTenantStore().setConfig(null)
  })

  it('hydrates the tenant store from the rendered tenant state', () => {
    const config = validTenantConfig('shop.example', { storeName: 'Shop Example', blogEnabled: true })
    useState('tenant').value = config

    hooks['app:created']()

    expect(useTenantStore().config).toEqual(config)
    expect(useTenantStore().blogEnabled).toBe(true)
  })

  it('leaves the store unresolved when no tenant was rendered', () => {
    useState('tenant').value = null

    hooks['app:created']()

    expect(useTenantStore().config).toBeNull()
  })
})
