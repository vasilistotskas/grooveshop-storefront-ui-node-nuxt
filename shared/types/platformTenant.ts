/**
 * Platform-only SEO attribution, emitted solely on the platform
 * tenant's storefront (see ``shared/utils/platformTenant.ts``).
 *
 * Resolved on the server from the PRIVATE ``runtimeConfig.platformTenant``
 * block and handed to the client as ``useState('platformTenant')`` —
 * ``null`` on every other tenant, so none of these values reach another
 * store's payload.
 */
export interface PlatformTenantMeta {
  /** ``author`` / ``creator`` / ``publisher`` meta. */
  authorName: string
  /** Google Search Console ``google-site-verification`` token. */
  googleSiteVerification: string
  /** Pinterest ``p:domain_verify`` token. */
  domainVerifyId: string
}
