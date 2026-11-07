import { useStorage } from 'nitropack/runtime'
import { createError, getRequestHeader, getRequestIP } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'

export interface RateLimit {
  /** Names the counter, so two limited endpoints never share a budget. */
  name: string
  windowSeconds: number
  maxRequests: number
}

/** What a counter holds: the window it counts and the requests in it so far. */
interface WindowCount {
  window: number
  count: number
}

/**
 * Count one request against a per-IP, per-store budget and refuse it with
 * a 429 once the budget is spent: at most `maxRequests` in each window of
 * `windowSeconds`.
 *
 * The IP is Cloudflare's `CF-Connecting-IP`, then `True-Client-IP`, then
 * h3's resolution — the order `clientIdentityHeaders` uses (`getRequestIP`
 * alone surfaces the socket peer, the Traefik pod). The key carries the
 * tenant host so a burst on one store's storefront never locks out another's.
 *
 * The windows are fixed: the counter stores the number of the window it
 * counts, and a request in a later window starts it again from one. A count
 * kept only alive by a TTL refreshed on every hit never ended a window under
 * steady traffic: twelve requests a minute reached a limit of 60 after five
 * minutes and were then refused a minute at a time, around the clock
 * (storefront #414). One key per IP, store and name, never one per window:
 * the memory driver the cache mount falls back to ignores TTLs, so a key per
 * window would pile up there. The TTL lets an idle counter go from Redis; it
 * is written explicitly because the driver default for the cache mount is
 * the hour-long `NUXT_REDIS_TTL`.
 *
 * The count is read, then written, so requests that arrive together can each
 * pass at the edge of a budget. It blunts a flood; it is not an exact quota.
 */
export async function enforceRateLimit(event: RequestEvent, { name, windowSeconds, maxRequests }: RateLimit): Promise<void> {
  const clientIp
    = getRequestHeader(event, 'cf-connecting-ip')
      || getRequestHeader(event, 'true-client-ip')
      || getRequestIP(event, { xForwardedFor: true })
      || 'unknown'

  const windowNumber = Math.floor(Date.now() / 1000 / windowSeconds)
  const storage = useStorage('cache')
  const rateLimitKey = `rate:${name}:${requestTenantHost(event)}:${clientIp}`
  const counted = await storage.getItem<WindowCount>(rateLimitKey)
  const count = counted?.window === windowNumber ? counted.count + 1 : 1

  if (count > maxRequests) {
    throw createError({
      status: 429,
      statusText: 'Too Many Requests',
    })
  }

  await storage.setItem<WindowCount>(rateLimitKey, { window: windowNumber, count }, { ttl: windowSeconds })
}
