// Per-IP rate limit: a strip reports one impression when shown and
// one click per tile followed, so 60/min per host is far above any
// legitimate browsing pace and low enough to blunt a script hammering
// the endpoint from a single host.
const RATE_LIMIT_WINDOW_SECONDS = 60
const RATE_LIMIT_MAX_REQUESTS = 60

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const clientIp
    = getRequestHeader(event, 'cf-connecting-ip')
      || getRequestHeader(event, 'true-client-ip')
      || getRequestIP(event, { xForwardedFor: true })
      || 'unknown'

  // Prefix with the tenant host so tenants don't share the same
  // rate-limit budget.
  const host = getRequestHost(event, { xForwardedHost: false })
  const storage = useStorage('cache')
  const rateLimitKey = `rate:recommendation-event:${host}:${clientIp}`
  const current = await storage.getItem<number>(rateLimitKey)
  const count = (current ?? 0) + 1

  if (count > RATE_LIMIT_MAX_REQUESTS) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
    })
  }

  // Explicit TTL on every hit (sliding window); the driver default is
  // the hour-long cache TTL and would silently widen the window.
  await storage.setItem(rateLimitKey, count, { ttl: RATE_LIMIT_WINDOW_SECONDS })

  try {
    const body = await readValidatedBody(event, zApiV1RecommendationsEventsCreateBody.parse)
    // Cart headers: tenant host, locale, the cart id and the access
    // token when signed in — the identity an ``attach`` will later be
    // correlated against, so the event carries the same one the
    // basket does.
    const headers = await useCartSession(event).getCartHeaders()
    await $fetch(`${config.apiBaseUrl}/recommendations/events`, {
      method: 'POST',
      headers,
      body,
    })
    setResponseStatus(event, 202)
    return null
  }
  catch (error) {
    handleError(error)
  }
})
