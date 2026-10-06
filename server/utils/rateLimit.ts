import type { H3Event } from 'h3'

export interface RateLimit {
  /** Names the counter, so two limited endpoints never share a budget. */
  name: string
  windowSeconds: number
  maxRequests: number
}

/**
 * Count one request against a per-IP, per-store budget and refuse it with
 * a 429 once the budget is spent.
 *
 * The IP is Cloudflare's `CF-Connecting-IP`, then `True-Client-IP`, then
 * h3's resolution — the order `clientIdentityHeaders` uses (`getRequestIP`
 * alone surfaces the socket peer, the Traefik pod). The key carries the
 * tenant host so a burst on one store's storefront never locks out another's.
 *
 * The counter is written with an explicit TTL on every hit: the driver
 * default for the cache mount is the hour-long `NUXT_REDIS_TTL`, which
 * would silently widen the window. Refreshing it on every hit makes the
 * window sliding, which is acceptable for a counter.
 */
export async function enforceRateLimit(event: H3Event, { name, windowSeconds, maxRequests }: RateLimit): Promise<void> {
  const clientIp
    = getRequestHeader(event, 'cf-connecting-ip')
      || getRequestHeader(event, 'true-client-ip')
      || getRequestIP(event, { xForwardedFor: true })
      || 'unknown'

  const storage = useStorage('cache')
  const rateLimitKey = `rate:${name}:${requestTenantHost(event)}:${clientIp}`
  const count = ((await storage.getItem<number>(rateLimitKey)) ?? 0) + 1

  if (count > maxRequests) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
    })
  }

  await storage.setItem(rateLimitKey, count, { ttl: windowSeconds })
}
