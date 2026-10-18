import type { TenantConfig } from '~~/shared/openapi/types.gen'
import { useTenantStore } from '~/stores/tenant'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'

/** The domain every field of the default tenant is derived from. */
export const TEST_TENANT_DOMAIN = 'test.local'

/**
 * Resolve the tenant for a `test/nuxt` spec: a schema-complete
 * `TenantConfig` (`validTenantConfig`, checked against `zTenantConfig`
 * in `test/unit/fixtures/tenantConfig.spec.ts`) with `overrides` on top,
 * written to the tenant store. Returns the config it set.
 *
 * Writes to the ACTIVE Pinia: the Nuxt app's own, unless the spec
 * swapped in a `createPinia()` with `setActivePinia`. A mounted
 * component injects the app's instance, so a spec that mounts must not
 * swap Pinia or the flag never reaches the component. (Only a spec that
 * calls a composable or store directly, outside a component, may swap
 * it; the code under test then reads the same swapped store.)
 *
 * The store outlives a test — Pinia state is not part of the project's
 * mock isolation — and `setConfig` replaces the whole config, so call
 * it in `beforeEach` (every test starts from the defaults) and again in
 * a test that needs a flag:
 *
 * ```ts
 * beforeEach(() => { setTenant() })
 * it('shows the rail when the plan includes loyalty', async () => {
 *   setTenant({ loyaltyEnabled: true })
 *   ...
 * })
 * ```
 *
 * Imports the store directly, so it writes the real store even in a
 * spec that `mockNuxtImport`s `useTenantStore` — such a spec has no use
 * for this helper.
 */
export function setTenant(overrides: Partial<TenantConfig> = {}): TenantConfig {
  const config: TenantConfig = validTenantConfig(TEST_TENANT_DOMAIN, overrides)
  useTenantStore().setConfig(config)
  return config
}

/**
 * Switch store features on or off for the tenant already in the store,
 * leaving every other field as it is — what a spec of a feature-gated
 * component wants, since `TenantConfig.features` is the whole decision
 * (`useStoreFeature`). Starts from the default tenant when none is set.
 *
 * ```ts
 * setTenantFeatures({ blogComments: false })
 * ```
 */
export function setTenantFeatures(features: Partial<TenantConfig['features']>): TenantConfig {
  const store = useTenantStore()
  const current = store.config ?? validTenantConfig(TEST_TENANT_DOMAIN) as TenantConfig
  const config: TenantConfig = { ...current, features: { ...current.features, ...features } }
  store.setConfig(config)
  return config
}
