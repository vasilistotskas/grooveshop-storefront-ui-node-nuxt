import { defineEventHandler, readValidatedBody, setResponseStatus, useRuntimeConfig } from 'nuxt/server'

// Per-IP rate limit: a strip reports one impression when shown and
// one click per tile followed, so 60/min per host is far above any
// legitimate browsing pace and low enough to blunt a script hammering
// the endpoint from a single host.
const RATE_LIMIT = { name: 'recommendation-event', windowSeconds: 60, maxRequests: 60 }

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  await enforceRateLimit(event, RATE_LIMIT)

  try {
    const body = await readValidatedBody(event, zApiV1RecommendationsEventsCreateBody)
    // Cart headers: tenant host, locale, the cart id and the access
    // token when signed in — the identity an ``attach`` will later be
    // correlated against, so the event carries the same one the
    // basket does.
    const headers = await useCartSession(event).getCartHeaders()
    await useBackendFetch(event)(`${config.apiBaseUrl}/recommendations/events`, {
      method: 'POST',
      headers,
      body,
    })
    setResponseStatus(event, 202)
    return null
  }
  catch (error) {
    handleError(event, error)
  }
})
