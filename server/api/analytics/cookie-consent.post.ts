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

  const storage = useStorage('cache')
  const rateLimitKey = `rate:cookie-consent:${clientIp}`
  const current = await storage.getItem<number>(rateLimitKey)
  const count = (current ?? 0) + 1

  if (count > RATE_LIMIT_MAX_REQUESTS) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
    })
  }

  if (count === 1) {
    await storage.setItem(rateLimitKey, count, { ttl: RATE_LIMIT_WINDOW_SECONDS })
  }
  else {
    await storage.setItem(rateLimitKey, count)
  }

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
