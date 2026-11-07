import { useStorage } from 'nitropack/runtime'
import { createError, getRequestHeader, getRequestIP } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'

export interface RateLimit {
  /** Names the counter, so two limited endpoints never share a budget. */
  name: string
  windowSeconds: number
  maxRequests: number
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
 * The windows are fixed: the key carries the window's number, so every
 * window starts from zero. Keeping one key and refreshing its TTL on every
 * hit never ended a window under steady traffic: twelve requests a minute
 * reached a limit of 60 after five minutes and were then refused a minute
 * at a time, around the clock (storefront #414). The TTL only lets a past
 * window's counter go; it is written explicitly because the driver default
 * for the cache mount is the hour-long `NUXT_REDIS_TTL`.
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
  const rateLimitKey = `rate:${name}:${requestTenantHost(event)}:${clientIp}:${windowNumber}`
  const count = ((await storage.getItem<number>(rateLimitKey)) ?? 0) + 1

  if (count > maxRequests) {
    throw createError({
      status: 429,
      statusText: 'Too Many Requests',
    })
  }

  await storage.setItem(rateLimitKey, count, { ttl: windowSeconds })
}
