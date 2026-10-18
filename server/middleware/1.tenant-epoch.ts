import { defineEventHandler } from 'h3'

/**
 * Stamps the store's tenant-config epoch as a synthetic `x-tenant-epoch`
 * request header, so the cached-SSR route rules (`cache.varies` in
 * nuxt.config.ts) key every rendered page on it. See `tenantConfigEpoch`:
 * a page rendered by a pod that has not yet seen a purge is filed under
 * the old epoch, which no updated pod reads.
 *
 * Runs after `0.tenant.ts`, which has synced the epoch for this request.
 * A REQUEST header for the reason `1.device-class.ts` is one (Nitro's
 * `varies` reads the Node request's), and it overwrites any client-supplied
 * value: the header must never be spoofable into cache poisoning.
 */
export default defineEventHandler((event) => {
  event.node.req.headers['x-tenant-epoch'] = tenantConfigEpoch(requestTenantHost(event))
})
