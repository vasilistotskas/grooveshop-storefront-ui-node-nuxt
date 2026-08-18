// Per-IP rate limit: 30 events/min covers the legitimate ceiling
// (first-visit banner shown + decision, then occasional preference
// changes via the floating control button) with comfortable headroom
// against a script hammering the endpoint from a single host.
const RATE_LIMIT_WINDOW_SECONDS = 60
const RATE_LIMIT_MAX_REQUESTS = 30

export default defineEventHandler(async (event) => {
  const clientIp
    = getRequestHeader(event, 'cf-connecting-ip')
      || getRequestHeader(event, 'true-client-ip')
      || getRequestIP(event, { xForwardedFor: true })
      || 'unknown'

  // Prefix with the tenant host so tenants don't share the same rate-limit
  // budget (a burst on one tenant's storefront must not lock out another's).
  const host = getRequestHost(event, { xForwardedHost: false })
  const storage = useStorage('cache')
  const rateLimitKey = `rate:cookie-consent:${host}:${clientIp}`
  const current = await storage.getItem<number>(rateLimitKey)
  const count = (current ?? 0) + 1

  if (count > RATE_LIMIT_MAX_REQUESTS) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
    })
  }

  // Always pass an explicit TTL so the rate-limit window stays at
  // ``RATE_LIMIT_WINDOW_SECONDS``. Falling back to the driver default
  // (the long ``NUXT_REDIS_TTL`` for the cache mount) on subsequent
  // ``setItem`` calls would silently extend the rate-limit window to
  // an hour in production. Refreshing the TTL on every hit gives a
  // sliding window — acceptable for a counter.
  await storage.setItem(rateLimitKey, count, { ttl: RATE_LIMIT_WINDOW_SECONDS })

  const body = await readValidatedBody(event, ZodCookieConsentEventBody.parse)
  const wideLog = useLogger(event)

  if (body.event === 'banner_shown') {
    wideLog.set({ cookies: { event: 'banner_shown' } })
  }
  else {
    wideLog.set({
      cookies: {
        event: 'consent_decision',
        decision: body.decision,
        enabled_ids: body.enabledIds,
        enabled_count: body.enabledIds.length,
      },
    })
  }

  setResponseStatus(event, 204)
  return null
})
