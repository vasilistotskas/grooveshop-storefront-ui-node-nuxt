/**
 * The ONE rule for "is this store feature on": Django's effective state.
 *
 * `TenantConfig.features` is each optional feature's plan flag AND its
 * store settings, resolved by Django with the same permission classes
 * that answer 404 for the feature's API (docs/store-features.md in the
 * Django repo). The storefront reads that answer and nothing else: it
 * never combines a plan flag with a setting, copies a setting's default
 * or keeps a fallback for a setting it could not fetch.
 *
 * The names come from the generated `StoreFeatures` type, so a feature
 * Django adds is a compile-time name here the moment the schema is
 * regenerated. A store with no resolved tenant (probes, prerender, the
 * platform host) has none of them: Django answers all `false` there too.
 */
export type StoreFeatureName = keyof TenantConfig['features']

export function storeFeatureOn(
  tenant: Pick<TenantConfig, 'features'> | null | undefined,
  name: StoreFeatureName,
): boolean {
  return tenant?.features[name] ?? false
}
