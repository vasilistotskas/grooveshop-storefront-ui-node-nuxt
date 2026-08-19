/**
 * Apply per-tenant overrides to the @nuxtjs/seo siteConfig.
 *
 * Runs AFTER `0.tenant.ts` has populated `event.context.tenant`. An earlier
 * implementation was a Nitro `request` plugin hook, which fires before
 * route-scoped middleware — so `event.context.tenant` was always
 * `undefined` and the override silently did nothing (C7 in
 * MULTI_TENANT_AUDIT.md). A later fix moved this to route-scoped
 * middleware but still assigned a plain merged object directly to
 * `event.context.siteConfig` — that destroys the `SiteConfigStack`
 * instance (with its `.push()`/`.get()` methods) that
 * nuxt-site-config's own `init` middleware creates, so every consumer's
 * `getSiteConfig()`/`useSiteConfig()` call kept reading a stale/absent
 * stack and per-tenant SEO/canonical/RSS/manifest values stayed
 * platform-wide — again a silent no-op.
 *
 * `updateSiteConfig()` instead PUSHES a new layer onto the stack (see
 * `site-config-stack`'s `push`/`get`).
 *
 * The push carries an EXPLICIT `_priority` above the "runtime" tier
 * (0) used by nuxt-site-config's own `runtimeEnv` layer. This is
 * load-bearing: an earlier revision left the push unprioritised on the
 * assumption that the module's `init` middleware runs BEFORE scanned
 * `server/middleware/*` (equal priorities resolve in insertion order,
 * so later-inserted tenant values would win). In the production Nitro
 * build the order is the REVERSE — this middleware runs first, creates
 * the stack, and init's later `runtimeEnv` push buried the tenant
 * layer, so every non-platform tenant rendered the PLATFORM site
 * url/name in canonical/og:url/titleTemplate/sitemap (observed live on
 * staging tenant #2, 2026-08-19). An explicit higher priority wins
 * regardless of middleware ordering; keys we don't set (e.g.
 * `description` when the tenant has none) still fall through to the
 * platform-wide runtimeEnv values.
 */
const TENANT_SITE_CONFIG_PRIORITY = 10

export default defineEventHandler((event) => {
  const tenant = event.context.tenant
  if (!tenant) return
  if (!tenant.primaryDomain) return

  updateSiteConfig(event, {
    _priority: TENANT_SITE_CONFIG_PRIORITY,
    url: `https://${tenant.primaryDomain}`,
    name: tenant.storeName || tenant.name,
    ...(tenant.storeDescription
      ? { description: tenant.storeDescription }
      : {}),
  })
})
