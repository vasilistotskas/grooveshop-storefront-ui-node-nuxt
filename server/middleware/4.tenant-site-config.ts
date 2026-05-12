/**
 * Apply per-tenant overrides to the @nuxtjs/seo siteConfig.
 *
 * Runs AFTER `0.tenant.ts` has populated `event.context.tenant`. The
 * old implementation was a Nitro `request` plugin hook, which fires
 * before route-scoped middleware — so `event.context.tenant` was
 * always `undefined` and the override silently did nothing
 * (C7 in MULTI_TENANT_AUDIT.md).
 *
 * Middleware filename ordering (`4.*`) guarantees we run after every
 * earlier middleware (0.tenant, 1.locale, 2.evlog-auth, 3.csp).
 */
export default defineEventHandler((event) => {
  const tenant = event.context.tenant
  if (!tenant) return
  if (!tenant.primaryDomain) return

  event.context.siteConfig = {
    ...(event.context.siteConfig || {}),
    url: `https://${tenant.primaryDomain}`,
    name: tenant.storeName || tenant.name,
    ...(tenant.storeDescription
      ? { description: tenant.storeDescription }
      : {}),
  }
})
