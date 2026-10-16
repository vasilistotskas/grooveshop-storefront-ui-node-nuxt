import { defineEventHandler, getRequestHeader } from 'nuxt/server'

/**
 * Marks the post-deploy cache warm-up's own requests (`CACHE_WARM_HEADER`
 * in scripts/warm-cache.mjs; a unit test keeps the two names equal), so a
 * query for slow renders can leave them out.
 */
export const CACHE_WARM_HEADER = 'x-grooveshop-cache-warm'

/**
 * Who is asking, on the request's wide event: the coarse browser, OS, bot
 * and country facts (`clientFacts`, never the raw User-Agent), the device
 * class the page was rendered for, whether it is the post-deploy cache
 * warm-up, and the device class Cloudflare computed, when it sent one.
 * Enough to tell a crawler burst or the warm-up from real shoppers, or one
 * browser's failures from everyone's.
 *
 * Set on the request logger, not in an `evlog:enrich` hook, because evlog
 * prints the line when it emits and runs enrichers only afterwards, for
 * drains; there is no drain here (see `server/middleware/0.tenant.ts`).
 * The device class is the one from `1.device-class.ts`, the one the page
 * is rendered and cached for, rather than evlog's own classification (it
 * calls an iPad a tablet; the storefront serves it the mobile render).
 *
 * Nothing at all without a User-Agent. That is every internal `/api`
 * request a server render makes (the visitor's headers are not forwarded
 * to it), and `1.device-class.ts` classes an empty User-Agent as desktop,
 * so logging there would record a phone visitor's subrequests as
 * desktop. The page's own event carries the client.
 */
export default defineEventHandler((event) => {
  const userAgentHeader = getRequestHeader(event, 'user-agent')
  if (!userAgentHeader) return

  event.context.log?.set({
    client: {
      ...clientFacts(userAgentHeader, getRequestHeader(event, 'cf-ipcountry')),
      deviceClass: getRequestHeader(event, 'x-device-class'),
      cacheWarm: getRequestHeader(event, CACHE_WARM_HEADER) === '1',
      // Cloudflare's own class when it caches by device type. Never used
      // to render (shared/utils/deviceClass.ts); logged so a change in
      // Cloudflare's rules shows as edgeDeviceClass != deviceClass.
      edgeDeviceClass: getRequestHeader(event, 'cf-device-type'),
    },
  })
})
