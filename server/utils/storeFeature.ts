import type { RequestEvent } from 'nuxt/server'

/**
 * Whether a store feature is on for the request's store — the Nitro
 * twin of `useStoreFeature`, over the tenant `0.tenant.ts` resolved
 * into `event.context.tenant`. A route that proxies a feature's API
 * answers 404 for a store without it instead of asking Django to
 * refuse (and log `feature_gate:refused`).
 */
export function eventStoreFeature(
  event: Pick<RequestEvent, 'context'>,
  name: StoreFeatureName,
): boolean {
  return storeFeatureOn(event.context.tenant, name)
}
