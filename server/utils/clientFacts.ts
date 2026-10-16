import type { WideEvent } from 'evlog'
import { createGeoEnricher, createUserAgentEnricher } from 'evlog/enrichers'

const userAgentEnricher = createUserAgentEnricher()
const geoEnricher = createGeoEnricher()

/** The coarse facts about a visitor's browser a log line may carry. */
export interface ClientFacts {
  browser?: string
  os?: string
  bot: boolean
  country?: string
}

/**
 * Browser (name and major version), OS (name only), whether it is a bot,
 * and the country, from the request's User-Agent and Cloudflare's
 * `cf-ipcountry`. evlog's own enrichers do the parsing, on a scratch
 * context, and only the coarse fields are kept:
 *
 * - not the raw User-Agent string, which is detailed enough to help
 *   fingerprint a visitor, and not the full browser version;
 * - no OS version: browsers freeze it in the User-Agent (Windows 11 sends
 *   "Windows NT 10.0", every macOS "10_15_7"), so it would be wrong;
 * - behind Cloudflare, only the country: `cf-ipcountry` is the one
 *   location header Cloudflare sends.
 *
 * Shared by the request events (`server/middleware/2.evlog-client.ts`)
 * and the browser's own events (`server/plugins/evlog-client-context.ts`),
 * so one browser's failures line up across both.
 */
export function clientFacts(userAgentHeader: string, countryHeader?: string): ClientFacts {
  const headers: Record<string, string> = { 'user-agent': userAgentHeader }
  if (countryHeader) headers['cf-ipcountry'] = countryHeader
  const scratch = { event: {} as WideEvent, headers }
  userAgentEnricher(scratch)
  geoEnricher(scratch)

  const userAgent = scratch.event.userAgent as { browser?: { name: string, version?: string }, os?: { name: string }, device?: { type: string } } | undefined
  const major = (version?: string) => version?.split('.')[0]
  return {
    browser: userAgent?.browser && [userAgent.browser.name, major(userAgent.browser.version)].filter(Boolean).join(' '),
    os: userAgent?.os?.name,
    bot: userAgent?.device?.type === 'bot',
    country: (scratch.event.geo as { country?: string } | undefined)?.country,
  }
}
