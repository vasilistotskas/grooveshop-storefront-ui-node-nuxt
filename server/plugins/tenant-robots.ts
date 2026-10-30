import { requestTenantResult } from '../utils/requestTenant'
import { requestTenantHost } from '../utils/tenantHost'
import { defineNitroPlugin } from 'nitropack/runtime'

/**
 * Per-tenant robots.txt via @nuxtjs/robots' runtime Nitro hook.
 *
 * ``/robots.txt`` bypasses the tenant middleware (`tenantBypass.ts`) —
 * robots must never 404/503 on tenant-resolution failure — so the
 * tenant is resolved HERE (`requestTenantResult`: one lookup per request,
 * shared with every other caller), and the module's own handler keeps serving.
 *
 * - Resolved tenant on its primary domain: keep the platform bot
 *   policy (the 25-bot groups in nuxt.config.ts) and point the
 *   Sitemap line at the tenant's own origin.
 * - Alias domain / unknown host / failed resolution: full disallow —
 *   staging and alias hosts must not be indexed as duplicate content.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('robots:robots-txt', async (ctx) => {
    const event = ctx.e
    const result = await requestTenantResult(event)

    if (result.type !== 'ok') {
      ctx.robotsTxt = 'User-agent: *\nDisallow: /\n'
      return
    }

    const primaryDomain = result.config.primaryDomain
    if (primaryDomain && primaryDomain !== requestTenantHost(event)) {
      // Alias domain — disallow so it can't be indexed as duplicate
      // content of the primary.
      ctx.robotsTxt = 'User-agent: *\nDisallow: /\n'
      return
    }

    // Rewrite every Sitemap line onto the tenant's own origin.
    const siteUrl = `https://${primaryDomain || requestTenantHost(event)}`
    ctx.robotsTxt = ctx.robotsTxt.replace(
      /^Sitemap:.*$/gm,
      `Sitemap: ${siteUrl}/sitemap.xml`,
    )
  })
})
