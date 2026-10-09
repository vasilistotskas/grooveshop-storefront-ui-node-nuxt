import { defineEventHandler, readValidatedBody, setResponseStatus } from 'nuxt/server'

// Per-IP rate limit: 30 events/min covers the legitimate ceiling
// (first-visit banner shown + decision, then occasional preference
// changes via the floating control button) with comfortable headroom
// against a script hammering the endpoint from a single host.
const RATE_LIMIT = { name: 'cookie-consent', windowSeconds: 60, maxRequests: 30 }

export default defineEventHandler(async (event) => {
  await enforceRateLimit(event, RATE_LIMIT)

  const body = await readValidatedBody(event, ZodCookieConsentEventBody)
  const wideLog = event.context.log

  if (body.event === 'banner_shown') {
    wideLog?.set({ cookies: { event: 'banner_shown' } })
  }
  else {
    wideLog?.set({
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
