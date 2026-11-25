/**
 * The name a store's site goes by: its store name, else its tenant name.
 * The store's site config carries it (`server/plugins/tenant-site-config.ts`),
 * and what needs it as a `string` reads it here, since nuxt-site-config
 * types the resolved `name` as optional.
 */
export function storeSiteName(tenant: { storeName: string, name: string }): string {
  return tenant.storeName || tenant.name
}
