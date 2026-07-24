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
 * `site-config-stack`'s `push`/`get`). Left unprioritised, our push
 * implicitly resolves to the same "runtime" tier (priority 0 — the
 * highest/last-resolved tier) as nuxt-site-config's own `runtimeEnv`
 * push in its `init` middleware. Layers at equal priority resolve in
 * stack (insertion) order, and because this middleware runs after that
 * push (module middleware runs before user `server/middleware/*`, and
 * filename ordering (`4.*`) guarantees we also run after 0.tenant,
 * 1.locale, 2.evlog-auth, 3.csp), our tenant values win for the keys we
 * set here, while any key we don't set (e.g. `description` when the
 * tenant has none) still falls through to the platform-wide runtimeEnv
 * values.
 */
export default defineEventHandler((event) => {
  const tenant = event.context.tenant
  if (!tenant) return
  if (!tenant.primaryDomain) return

  updateSiteConfig(event, {
    url: `https://${tenant.primaryDomain}`,
    name: tenant.storeName || tenant.name,
    ...(tenant.storeDescription
      ? { description: tenant.storeDescription }
      : {}),
  })
})
