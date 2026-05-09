export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const tenant = event.context.tenant
    if (!tenant) return

    // Override site config for SEO (sitemap, OG images, Schema.org, canonical URLs)
    if (tenant.primaryDomain) {
      event.context.siteConfig = {
        ...(event.context.siteConfig || {}),
        url: `https://${tenant.primaryDomain}`,
        name: tenant.storeName || tenant.name,
        // Inject per-tenant store description for OG meta, sitemap, and
        // Schema.org. Falls back to the platform NUXT_SITE_DESCRIPTION env var
        // (already in siteConfig from @nuxtjs/seo) when empty.
        ...(tenant.storeDescription
          ? { description: tenant.storeDescription }
          : {}),
      }
    }
  })
})
