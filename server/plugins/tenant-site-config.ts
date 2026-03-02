export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const tenant = event.context.tenant as TenantConfig | undefined
    if (!tenant) return

    // Override site config for SEO (sitemap, OG images, Schema.org, canonical URLs)
    if (tenant.primaryDomain) {
      event.context.siteConfig = {
        ...(event.context.siteConfig || {}),
        url: `https://${tenant.primaryDomain}`,
        name: tenant.storeName || tenant.name,
      }
    }
  })
})
