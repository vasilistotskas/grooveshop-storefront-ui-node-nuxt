import { getRequestHost } from 'h3'
import { getTenantConfig } from '../utils/tenant'

/**
 * Per-tenant robots.txt via @nuxtjs/robots' runtime Nitro hook.
 *
 * ``/robots.txt`` stays in the tenant middleware's BYPASS_EXACT list —
 * robots must never 404/503 on tenant-resolution failure — so the
 * tenant is resolved HERE (cheap: getTenantConfig's 5-minute in-memory
 * cache), and the module's own handler keeps serving.
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
    const host = getRequestHost(event, { xForwardedHost: false })
    const hostNoPort = host.replace(/:\d+$/, '')
    const result = await getTenantConfig(host)

    if (result.type !== 'ok') {
      ctx.robotsTxt = 'User-agent: *\nDisallow: /\n'
      return
    }

    const primaryDomain = result.config.primaryDomain
    if (primaryDomain && primaryDomain !== hostNoPort) {
      // Alias domain — disallow so it can't be indexed as duplicate
      // content of the primary.
      ctx.robotsTxt = 'User-agent: *\nDisallow: /\n'
      return
    }

    // Rewrite every Sitemap line onto the tenant's own origin.
    const siteUrl = `https://${primaryDomain || hostNoPort}`
    ctx.robotsTxt = ctx.robotsTxt.replace(
      /^Sitemap:.*$/gm,
      `Sitemap: ${siteUrl}/sitemap.xml`,
    )
  })
})
