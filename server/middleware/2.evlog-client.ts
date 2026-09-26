import type { WideEvent } from 'evlog'
import { createGeoEnricher, createUserAgentEnricher } from 'evlog/enrichers'

const userAgentEnricher = createUserAgentEnricher()
const geoEnricher = createGeoEnricher()

/**
 * Who is asking, on the request's wide event: browser (name and major
 * version), OS (name only), the device class the page was rendered for,
 * whether it is a bot, and the country. Enough to tell a crawler burst
 * from real shoppers, or one browser's failures from everyone's.
 *
 * Set on the request logger, not in an `evlog:enrich` hook, because evlog
 * prints the line when it emits and runs enrichers only afterwards, for
 * drains; there is no drain here (see `server/middleware/0.tenant.ts`).
 * evlog's own enrichers do the parsing, run on a scratch context, and only
 * the coarse fields are kept:
 *
 * - not the raw User-Agent string, which is detailed enough to help
 *   fingerprint a visitor, and not the full browser version;
 * - no OS version: browsers freeze it in the User-Agent (Windows 11 sends
 *   "Windows NT 10.0", every macOS "10_15_7"), so it would be wrong;
 * - the device class from `1.device-class.ts`, the one the page is
 *   rendered and cached for, rather than evlog's own classification (it
 *   calls an iPad a tablet; the storefront serves it the mobile render);
 * - behind Cloudflare, only the country: `cf-ipcountry` is the one
 *   location header Cloudflare sends.
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
  const headers: Record<string, string> = { 'user-agent': userAgentHeader }
  const countryHeader = getRequestHeader(event, 'cf-ipcountry')
  if (countryHeader) headers['cf-ipcountry'] = countryHeader
  const scratch = { event: {} as WideEvent, headers }
  userAgentEnricher(scratch)
  geoEnricher(scratch)

  const userAgent = scratch.event.userAgent as { browser?: { name: string, version?: string }, os?: { name: string }, device?: { type: string } } | undefined
  const country = (scratch.event.geo as { country?: string } | undefined)?.country
  const major = (version?: string) => version?.split('.')[0]

  useLogger(event).set({
    client: {
      browser: userAgent?.browser && [userAgent.browser.name, major(userAgent.browser.version)].filter(Boolean).join(' '),
      os: userAgent?.os?.name,
      deviceClass: getRequestHeader(event, 'x-device-class'),
      bot: userAgent?.device?.type === 'bot',
      country,
    },
  })
})
